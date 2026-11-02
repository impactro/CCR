"""Closed shared-SVG document export. No downloads, package installs or browsers."""
from __future__ import annotations
import base64
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
from . import __version__

MAX_INPUT=1_048_576
MAX_IMAGE_BYTES=6_000_000
MAX_PIXELS=16_000_000
MAX_PAGES=32
MAX_ARTIFACT_BYTES=64_000_000


def image_dimensions(raw: bytes):
    """Inspect bounded PNG/JPEG headers before allocating decoded pixels."""
    if raw.startswith(b'\x89PNG\r\n\x1a\n') and len(raw)>=24 and raw[12:16]==b'IHDR':
        return int.from_bytes(raw[16:20],'big'),int.from_bytes(raw[20:24],'big')
    if raw.startswith(b'\xff\xd8'):
        offset=2
        while offset<len(raw):
            if raw[offset]!=255:break
            while offset<len(raw) and raw[offset]==255:offset+=1
            if offset>=len(raw):break
            marker=raw[offset];offset+=1
            if marker in (0xd9,0xda):break
            if marker in (0x01,0xd8) or 0xd0<=marker<=0xd7:continue
            length=int.from_bytes(raw[offset:offset+2],'big')
            if length<2 or offset+length>len(raw):break
            if marker in (0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf) and length>=8:
                return int.from_bytes(raw[offset+5:offset+7],'big'),int.from_bytes(raw[offset+3:offset+5],'big')
            offset+=length
    raise ValueError('Invalid PNG/JPEG dimensions.')


def scoped(root: Path, path: Path) -> Path:
    root=root.resolve(strict=True)
    candidate=(root/path).resolve() if not path.is_absolute() else path.resolve()
    # Check against the lexical workspace, not a resolved temp symlink target.
    if not any(candidate.is_relative_to(root/name) for name in ('temp','outputs')):
        raise ValueError('Document paths must stay under agent-root temp/ or outputs/.')
    return candidate


def read_json(path: Path, limit=MAX_INPUT):
    if path.stat().st_size>limit:raise ValueError('JSON byte limit exceeded.')
    def pairs(items):
        result={}
        for key,value in items:
            if key in result:raise ValueError('Duplicate JSON key.')
            result[key]=value
        return result
    return json.loads(path.read_text('utf-8-sig'),object_pairs_hook=pairs,parse_constant=lambda _:(_ for _ in ()).throw(ValueError('Non-finite JSON number.')))


def runtime_path() -> Path:
    runtime=Path(__file__).parent/'runtime/export.mjs'
    provenance=read_json(runtime.with_name('provenance.json'))
    if provenance.get('version')!=__version__ or hashlib.sha256(runtime.read_bytes()).hexdigest()!=provenance.get('runtimeSha256'):
        raise ValueError('Stale or corrupt CCR export runtime; rebuild the package.')
    return runtime


def load_resources(root: Path, mapping: Path | None, fitz):
    if mapping is None:return {}
    resources=read_json(scoped(root,mapping),65536)
    if not isinstance(resources,dict) or len(resources)>12:raise ValueError('Invalid resource mapping (maximum12).')
    result={};total=0
    import re
    for key,path in resources.items():
        if not re.fullmatch(r'[a-zA-Z][a-zA-Z0-9_-]{0,63}',key) or not isinstance(path,str):raise ValueError('Invalid logical resource mapping.')
        target=scoped(root,Path(path))
        if target.suffix.lower() not in ('.png','.jpg','.jpeg') or target.stat().st_size>MAX_IMAGE_BYTES:raise ValueError('Only bounded local PNG/JPEG resources are supported.')
        raw=target.read_bytes();total+=len(raw)
        if total>18_000_000:raise ValueError('Total resource byte limit exceeded.')
        mime='image/png' if raw.startswith(b'\x89PNG\r\n\x1a\n') else 'image/jpeg' if raw.startswith(b'\xff\xd8\xff') else None
        if mime is None:raise ValueError('Invalid PNG/JPEG signature.')
        # Read dimensions before decoding pixels (reject decompression bombs).
        width,height=image_dimensions(raw)
        if width<1 or height<1 or width*height>MAX_PIXELS:raise ValueError('Image pixel limit exceeded or invalid image.')
        pix=fitz.Pixmap(raw)
        if pix.width!=width or pix.height!=height:raise ValueError('Image dimensions mismatch.')
        result[key]={'mime':mime,'base64':base64.b64encode(raw).decode('ascii'),'width':pix.width,'height':pix.height}
    return result


def export_document(agent_root: Path, data: Path, output: Path, resources: Path | None=None):
    root=Path(agent_root).resolve(strict=True)
    if not root.is_dir():raise ValueError('agent-root must be a directory.')
    source,target=scoped(root,Path(data)),scoped(root,Path(output))
    if target.suffix.lower() not in ('.png','.pdf') or target.exists():raise ValueError('Output must be a new PNG/PDF; overwrite is forbidden.')
    document=read_json(source)
    try:import fitz
    except ImportError as exc:raise ValueError('PyMuPDF export backend unavailable; provision it before use.') from exc
    node=shutil.which('node')
    if not node:raise ValueError('Node export runtime unavailable.')
    payload={'document':document,'resources':load_resources(root,resources,fitz)}
    try:
        # Keep Windows bootstrap only, never inherit NODE_OPTIONS or credentials.
        node_env={key:os.environ[key] for key in ('SystemRoot','WINDIR') if key in os.environ}
        proc=subprocess.run([node,'--max-old-space-size=128',str(runtime_path())],input=json.dumps(payload,ensure_ascii=False),capture_output=True,text=True,encoding='utf8',timeout=30,env=node_env)
    except subprocess.TimeoutExpired as exc:raise ValueError('Export runtime timeout.') from exc
    if proc.returncode:raise ValueError('Document export rejected: '+proc.stderr[:240])
    if len(proc.stdout)>64_000_000:raise ValueError('Export SVG byte limit exceeded.')
    pages=json.loads(proc.stdout)['pages']
    if not 1<=len(pages)<=MAX_PAGES:raise ValueError('Export page limit exceeded.')
    if target.suffix.lower()=='.png' and len(pages)!=1:raise ValueError('Multi-page document requires PDF; PNG never truncates pages.')
    pdf=fitz.open()
    try:
        for svg in pages:
            with fitz.open(stream=svg.encode('utf8'),filetype='svg') as page:
                with fitz.open(stream=page.convert_to_pdf(),filetype='pdf') as converted:pdf.insert_pdf(converted)
        dimensions=[{'width':round(p.rect.width),'height':round(p.rect.height)} for p in pdf]
        if any(d['width']*d['height']>MAX_PIXELS for d in dimensions):raise ValueError('Export pixel limit exceeded.')
        raw=pdf[0].get_pixmap(alpha=False).tobytes('png') if target.suffix.lower()=='.png' else pdf.tobytes(garbage=4,deflate=True)
    finally:pdf.close()
    if len(raw)>MAX_ARTIFACT_BYTES:raise ValueError('Export artifact byte limit exceeded.')
    target.parent.mkdir(parents=True,exist_ok=True)
    # Exclusive creation also protects a race with another writer.
    try:
        with target.open('xb') as stream:stream.write(raw)
    except FileExistsError as exc:raise ValueError('Output exists; overwrite is forbidden.') from exc
    return {'artifacts':[{'path':str(target),'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),'format':target.suffix[1:].lower(),'width':dimensions[0]['width'],'height':dimensions[0]['height'],'pages':len(pages),'pageDimensions':dimensions}], 'runtimeVersion':__version__}
