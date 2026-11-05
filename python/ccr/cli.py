"""Public module tools. Cache public bases; keep customer renders in outputs."""
from __future__ import annotations
import argparse,json,math,sys
from pathlib import Path
from .geography import GeographyCache, GeographyUnavailable
from .drawing import render_svg


def main(argv=None):
    parser=argparse.ArgumentParser(description=__doc__)
    commands=parser.add_subparsers(dest='command',required=True)
    positions=commands.add_parser('render-positions',help='Mapa local de cinco ou mais clientes dentro de um raio, sem rede ou rastreamento.')
    positions.add_argument('--agent-root',type=Path,required=True)
    positions.add_argument('--data',type=Path,required=True)
    positions.add_argument('--output',type=Path,required=True)
    export=commands.add_parser('export-document',help='Export a bounded CES document using the packaged shared SVG runtime.')
    export.add_argument('--agent-root',type=Path,required=True)
    export.add_argument('--data',type=Path,required=True)
    export.add_argument('--resources',type=Path)
    export.add_argument('--output',type=Path,required=True)
    for name in ('prepare-map','lookup-place','render-map'):
        command=commands.add_parser(name)
        command.add_argument('--agent-root',type=Path,required=True)
        if name=='lookup-place':
            command.add_argument('--name',action='append',required=True)
            command.add_argument('--kind',choices=('city','state','country','continent','neighborhood'),default='city')
            command.add_argument('--state')
        else:command.add_argument('--key',required=True)
        if name=='prepare-map':
            command.add_argument('--refresh',action='store_true')
            command.add_argument('--png',action='store_true')
        if name=='render-map':
            command.add_argument('--data',type=Path,required=True,help='JSON with title, values [{code,value}], optional points [{latitude,longitude,label}].')
            command.add_argument('--output',type=Path,required=True)
    args=parser.parse_args(argv)
    try:
        root=args.agent_root.resolve()
        if not root.is_dir():raise ValueError('Raiz do consumidor não existe.')
        if args.command=='render-positions':
            from .positions import export_positions
            print(json.dumps({'ok':True,'result':export_positions(root,args.data,args.output)},ensure_ascii=False));return 0
        if args.command=='export-document':
            from .document_export import export_document
            result=export_document(root,args.data,args.output,args.resources)
            print(json.dumps({'ok':True,'result':result},ensure_ascii=False));return 0
        cache=GeographyCache(root/'data/ccr/geography')
        if args.command=='lookup-place':result=cache.lookup(args.name,kind=args.kind,state=args.state)
        elif args.command=='prepare-map':
            base=cache.ensure(args.key,refresh=args.refresh)
            if args.png:
                hit=base['cacheHit'];base=cache.png(args.key);base['cacheHit']=hit
            result={k:base[k] for k in ('key','cacheHit','svg','generation')}
            result.update({'regions':len(base['data']['regions']),'obtainedAt':base['data']['obtainedAt'],'customerData':False,'manifest':str(Path(base['svg']).with_name('manifest.json'))})
            if args.png:result['png']=base['png']
        else:
            def scoped(path):
                p=(root/path).resolve() if not path.is_absolute() else path.resolve()
                if not any(p.is_relative_to((root/name).resolve()) for name in ('temp','outputs')):raise ValueError('Dados e saída devem ficar em temp/ ou outputs/ do consumidor.')
                return p
            source,target=scoped(args.data),scoped(args.output)
            if target.exists() or target.suffix.lower() not in ('.png','.svg'):raise ValueError('Informe saída SVG/PNG nova, sem sobrescrever arquivo.')
            if source.stat().st_size>5_000_000:raise ValueError('Dados de sobreposição excedem limite5MB.')
            spec=json.loads(source.read_text('utf8'))
            if set(spec)-{'title','values','points'}:raise ValueError('Campos de render não suportados.')
            values=spec.get('values',[]);points=spec.get('points',[])
            if not isinstance(values,list) or not isinstance(points,list) or len(values)>6000 or len(points)>5000:raise ValueError('Sobreposições inválidas/excedem limite.')
            base=cache.ensure(args.key);known={r['code'] for r in base['data']['regions']};numbers={}
            for item in values:
                code=str(item['code']);value=item['value']
                if code not in known or code in numbers or isinstance(value,bool) or not isinstance(value,(int,float)) or not math.isfinite(value) or value<0:raise ValueError('Código/quantidade inválido, duplicado ou fora do recorte; agregar explicitamente antes.')
                numbers[code]=value
            for point in points:
                for field,bound in (('latitude',90),('longitude',180)):
                    value=point[field]
                    if isinstance(value,bool) or not isinstance(value,(int,float)) or not math.isfinite(value) or abs(value)>bound:raise ValueError('GPS de sobreposição inválido.')
            svg,_=render_svg(str(spec.get('title') or base['data']['title']),base['data']['regions'],values=numbers,points=points,country_crop=args.key.startswith('country-'),attribution=base['data']['attribution'])
            target.parent.mkdir(parents=True,exist_ok=True)
            if target.suffix.lower()=='.svg':target.write_text(svg,encoding='utf8',newline='\n')
            else:
                import fitz
                with fitz.open(stream=svg.encode('utf8'),filetype='svg') as document:document[0].get_pixmap(alpha=False).save(target)
            result={'path':str(target),'key':args.key,'regionsWithValues':len(numbers),'gpsPoints':len(points),'customerData':True,'cacheHit':base['cacheHit']}
        print(json.dumps({'ok':True,'result':result},ensure_ascii=False));return 0
    except (OSError,ValueError,KeyError,TypeError,ImportError,RuntimeError,GeographyUnavailable) as exc:
        print(json.dumps({'ok':False,'status':'unavailable' if isinstance(exc,GeographyUnavailable) else 'invalid','error':str(exc)},ensure_ascii=False));return 1


if __name__=='__main__':raise SystemExit(main())
