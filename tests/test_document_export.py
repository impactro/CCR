"""Real raster/PDF in memory: sandbox denies .agents/temp writes, never spill elsewhere."""
import base64
import hashlib
import io
import json
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

# Source-only checkout, matching the existing Python test entry point.
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'python'))
import fitz
from ccr import document_export as export
from ccr.cli import main
from ccr.cm import describe


def fixture(name):return json.loads((ROOT/'examples/rich-documents'/f'{name}.json').read_text('utf8'))


class Sink(io.BytesIO):
    def close(self):pass  # retain bytes for assertions; nothing persisted


def render(document,extension='pdf',resources=None):
    """Exercise public export_document and actual Node/PyMuPDF; virtualize only file IO."""
    root=ROOT/'.agents';source=root/'temp/synthetic.json';target=root/f'temp/synthetic.{extension}'
    original_json=export.read_json;original_open=Path.open;sink=Sink()
    def read(path,*args):return document if path==source else original_json(path,*args)
    def open_file(path,*args,**kwargs):
        if path==target:
            assert args==('xb',)
            return sink
        return original_open(path,*args,**kwargs)
    with patch.object(export,'read_json',side_effect=read),patch.object(export,'load_resources',return_value=resources or {}),patch.object(Path,'mkdir'),patch.object(Path,'open',open_file):
        manifest=export.export_document(root,Path('temp/synthetic.json'),Path(f'temp/synthetic.{extension}'))
    return sink.getvalue(),manifest


class DocumentExportTest(unittest.TestCase):
    def test_six_panel_real_png_and_manifest(self):
        raw,result=render(fixture('six-panel-report'),'png')
        self.assertTrue(raw.startswith(b'\x89PNG\r\n\x1a\n'))
        pix=fitz.Pixmap(raw);self.assertEqual((pix.width,pix.height),(1200,1600))
        item=result['artifacts'][0];self.assertEqual(item['sha256'],hashlib.sha256(raw).hexdigest());self.assertEqual(item['bytes'],len(raw))
        self.assertEqual(item['pages'],1);self.assertEqual(item['format'],'png');self.assertTrue(Path(item['path']).is_absolute())
        self.assertEqual(item['pageDimensions'],[{'width':1200,'height':1600}])
        # Real scene pixels, not a renamed text file or blank page.
        self.assertGreater(len(set(pix.samples[::31])),50)

    def test_real_pdf_contains_all_six_titles_units_and_negative_zero(self):
        raw,result=render(fixture('six-panel-report'))
        self.assertTrue(raw.startswith(b'%PDF-'))
        with fitz.open(stream=raw,filetype='pdf') as doc:
            self.assertEqual(len(doc),result['artifacts'][0]['pages'])
            text=''.join(p.get_text() for p in doc)
            for i in range(1,7):self.assertIn(f'Painel {i}',text)
            self.assertIn('itens',text);self.assertIn('%',text);self.assertIn('-2',text);self.assertIn('0',text)

    def test_multipage_table_pdf_no_loss_and_png_rejects(self):
        doc=fixture('mixed-series');doc['view']='table';del doc['data']['chart']
        doc['data']['rows']=[[f'Row {i}',i,None] for i in range(200)]
        raw,result=render(doc)
        with fitz.open(stream=raw,filetype='pdf') as pdf:
            self.assertGreater(len(pdf),1);self.assertEqual(len(pdf),result['artifacts'][0]['pages']);text=''.join(p.get_text() for p in pdf)
            for i in range(200):self.assertIn(f'Row {i}\n',text)
        with self.assertRaisesRegex(ValueError,'Multi-page'):render(doc,'png')

    def test_real_png_and_jpeg_embedded_resources(self):
        pix=fitz.Pixmap(fitz.csRGB,fitz.IRect(0,0,120,60),False);pix.clear_with(255);pix.set_rect(fitz.IRect(10,10,110,50),(0,70,220))
        for ext,mime in [('png','image/png'),('jpeg','image/jpeg')]:
            image=pix.tobytes(ext)
            resource={'amostra':{'mime':mime,'base64':base64.b64encode(image).decode(),'width':120,'height':60}}
            raw,_=render(fixture('image-report'),'png',resource)
            raster=fitz.Pixmap(raw);samples=raster.samples
            self.assertTrue(any(samples[i+2]>samples[i]+70 for i in range(0,len(samples)-2,3)))
            pdf,_=render(fixture('image-report'),'pdf',resource)
            with fitz.open(stream=pdf,filetype='pdf') as document:self.assertIn('Imagem de exemplo',document[0].get_text())

    def test_resource_loader_checks_signatures_bytes_pixels_and_scope(self):
        root=ROOT/'.agents';mapping=root/'temp/resources.json';target=root/'temp/sample.png'
        pix=fitz.Pixmap(fitz.csRGB,fitz.IRect(0,0,2,2),False);pix.clear_with(255);raw=pix.tobytes('png')
        original_stat=Path.stat;original_bytes=Path.read_bytes
        def stat(path,*args,**kwargs):
            if path==target:return type('Stat',(),{'st_size':len(raw)})()
            return original_stat(path,*args,**kwargs)
        def read(path):return raw if path==target else original_bytes(path)
        with patch.object(export,'read_json',return_value={'amostra':'temp/sample.png'}),patch.object(Path,'stat',stat),patch.object(Path,'read_bytes',read):
            self.assertEqual(export.load_resources(root,Path('temp/resources.json'),fitz)['amostra']['width'],2)
            with patch.object(export,'MAX_IMAGE_BYTES',1),self.assertRaisesRegex(ValueError,'bounded'):export.load_resources(root,Path('temp/resources.json'),fitz)
            with patch.object(export,'MAX_PIXELS',1),self.assertRaisesRegex(ValueError,'pixel'):export.load_resources(root,Path('temp/resources.json'),fitz)
        with patch.object(export,'read_json',return_value={'amostra':'../private.png'}),self.assertRaisesRegex(ValueError,'temp/'):export.load_resources(root,Path('temp/resources.json'),fitz)

    def test_failures_are_explicit_without_fallback(self):
        with self.assertRaisesRegex(ValueError,'missing_image_resource'):render(fixture('image-report'))
        doc=fixture('mixed-series');doc['view']='map';del doc['data']['chart']
        with self.assertRaisesRegex(ValueError,'export_view_unsupported'):render(doc)
        with patch.object(export.shutil,'which',return_value=None),self.assertRaisesRegex(ValueError,'Node'):render(fixture('mixed-series'))
        with patch.object(export.subprocess,'run',side_effect=export.subprocess.TimeoutExpired('node',30)),self.assertRaisesRegex(ValueError,'timeout'):render(fixture('mixed-series'))
        with patch.object(export,'MAX_ARTIFACT_BYTES',1),self.assertRaisesRegex(ValueError,'artifact byte'):render(fixture('mixed-series'))

    def test_paths_and_overwrite(self):
        root=ROOT/'.agents'
        for path in ['../README.md','/outside.png','temp/../../outside.png']:
            with self.assertRaises(ValueError):export.scoped(root,Path(path))
        with patch.object(Path,'exists',return_value=True),self.assertRaisesRegex(ValueError,'overwrite'):export.export_document(root,Path('temp/a.json'),Path('outputs/a.pdf'))

    def test_stale_runtime_version_and_hash_fail(self):
        path=export.runtime_path();self.assertTrue(path.is_file())
        with patch.object(export,'read_json',return_value={'version':'old'}),self.assertRaisesRegex(ValueError,'Stale'):export.runtime_path()
        with patch.object(export,'read_json',return_value={'version':export.__version__,'runtimeSha256':'0'*64}),self.assertRaisesRegex(ValueError,'Stale'):export.runtime_path()

    def test_page_limit_and_closed_runtime_without_package_imports(self):
        doc=fixture('mixed-series');doc['view']='table';del doc['data']['chart']
        doc['data']['rows']=[[f'Row {i}',i,None] for i in range(2000)]
        with self.assertRaisesRegex(ValueError,'page_limit'):render(doc)
        source=export.runtime_path().read_text('utf8')
        self.assertNotRegex(source,r'(?m)^import ')
        self.assertNotIn('node_modules',source)

    def test_image_header_rejects_invalid_and_oversize_before_decode(self):
        with self.assertRaisesRegex(ValueError,'dimensions'):export.image_dimensions(b'not an image')
        for ext in ['png','jpeg']:
            pix=fitz.Pixmap(fitz.csRGB,fitz.IRect(0,0,12,7),False);pix.clear_with(255)
            self.assertEqual(export.image_dimensions(pix.tobytes(ext)),(12,7))

    def test_cm_cli_and_wheel_data_contract(self):
        cm=describe();self.assertEqual(cm['operations']['export-document']['effects'],['read-files','write-files'])
        self.assertTrue(cm['skillGroups'][0]['skills'][0]['path'].is_file())
        with patch('ccr.document_export.export_document',return_value={'artifacts':[]}) as call,patch('sys.stdout',new_callable=io.StringIO) as stdout:
            self.assertEqual(main(['export-document','--agent-root',str(ROOT),'--data','temp/x.json','--output','outputs/x.pdf']),0)
            self.assertTrue(json.loads(stdout.getvalue())['ok']);call.assert_called_once()
        import tomllib,fnmatch
        config=tomllib.loads((ROOT/'pyproject.toml').read_text())
        for name in ['runtime/export.mjs','runtime/provenance.json','skills/document-export/SKILL.md','prompts/document-export.md']:
            self.assertTrue(any(fnmatch.fnmatch(name,p) for p in config['tool']['setuptools']['package-data']['ccr']))
            self.assertTrue((ROOT/'python/ccr'/name).is_file())


if __name__=='__main__':unittest.main()
