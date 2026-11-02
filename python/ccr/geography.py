"""Lazy, bounded public polygon recipes with atomic, persistent local caching."""
from __future__ import annotations

import copy
import datetime
import gzip
import hashlib
import json
import math
import os
import re
import time
import urllib.parse
import urllib.request
import uuid
from contextlib import contextmanager
from functools import lru_cache
from pathlib import Path

from .drawing import normalize, render_svg
from .geometry import center, rounded, simplified_geometry

REVISION = 'polygon-recipes-1'
DRAWING_VERSION = 2
MAX_BYTES = 24_000_000
IBGE = 'https://servicodados.ibge.gov.br/api/'
WORLD = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/9380cca83db5f9aef52d5e762765100745f84b27/geojson/ne_50m_admin_0_countries.geojson'
SEATS = 'https://geo.infrasa.gov.br/server/rest/services/Hosted/Sedes_Municipais/FeatureServer/17/query'
SIGA = 'https://sigamapa.santoandre.sp.gov.br/MapaService/wfs'
UFS = frozenset('AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split())
CONTINENTS = {'Europe':'Europa','Asia':'Ásia','Africa':'África','North America':'América do Norte','South America':'América do Sul','Oceania':'Oceania','Antarctica':'Antártida','Seven seas (open ocean)':'Ilhas oceânicas'}


class GeographyUnavailable(RuntimeError):
    """No valid result: do not fabricate geography or replace a valid cache."""


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def encode(value):
    return (json.dumps(value, ensure_ascii=False, separators=(',', ':'), allow_nan=False)+'\n').encode('utf-8')


def validate_geometry(geometry):
    if not isinstance(geometry, dict) or geometry.get('type') not in ('Polygon', 'MultiPolygon'):
        raise GeographyUnavailable('A fonte não forneceu polígonos de fronteiras.')
    polygons = [geometry['coordinates']] if geometry['type']=='Polygon' else geometry['coordinates']
    if not polygons: raise GeographyUnavailable('Malha vazia.')
    for polygon in polygons:
        if not polygon: raise GeographyUnavailable('Polígono vazio.')
        for ring in polygon:
            if len(ring)<4 or ring[0]!=ring[-1]: raise GeographyUnavailable('Anel de fronteira inválido.')
            for point in ring:
                if len(point)!=2 or any(isinstance(v,bool) or not isinstance(v,(int,float)) or not math.isfinite(v) for v in point) or abs(point[0])>180 or abs(point[1])>90:
                    raise GeographyUnavailable('Coordenadas da fonte inválidas; esperado longitude/latitude EPSG:4326.')


def mesh_url(scope, identity, subdivision=None):
    query={'formato':'application/vnd.geo+json','qualidade':'minima'}
    if subdivision: query['intrarregiao']=subdivision
    return IBGE+'v3/malhas/'+scope+'/'+identity+'?'+urllib.parse.urlencode(query)


def feature(code, name, geometry, **extra):
    validate_geometry(geometry)
    latitude,longitude=center(geometry)
    return {'code':str(code),'name':str(name),'geometry':geometry,'latitude':latitude,'longitude':longitude,**extra}


@lru_cache(maxsize=16)
def _lookup_index(path, expected):
    raw=Path(path).read_bytes()
    if digest(raw)!=expected:raise GeographyUnavailable('Índice: integridade da base inválida.')
    data=json.loads(raw);tables={k:{} for k in ('city','state','country','continent','neighborhood')}
    def add(kind,key,row):
        found=tables[kind].setdefault(normalize(key),[])
        if row not in found:found.append(row)
    for r in data['cities']:
        row={'name':r[0],'state':r[1],'latitude':r[2],'longitude':r[3],'ibge_code':r[4],'reference':'geometry_centroid' if data['key'].startswith('state-') else 'municipal_seat'}
        for key in (r[0],r[4],r[0]+'/'+r[1]):add('city',key,row)
    for kind,rows in (('state',data['states']),('country',data['countries']),('neighborhood',[r for r in data['regions'] if r.get('level')=='neighborhood'])):
        for r in rows:
            row={k:v for k,v in r.items() if k!='geometry'}
            for field in ('name','name_en','uf','code','iso2','iso3'):
                if row.get(field):add(kind,row[field],row)
            if kind=='country':add('continent',row['continent'],row)
    return tables


class GeographyCache:
    def __init__(self, root):
        self.root=Path(root).expanduser().resolve()

    @staticmethod
    def key(value):
        if not isinstance(value,str) or len(value)>100 or not re.fullmatch(r'[a-zA-Z0-9][a-zA-Z0-9-]*',value):
            raise ValueError('Chave de receita inválida; não usar URL nem caminho.')
        if value in ('brazil','world'): return value
        if value.startswith('state-') and value[6:] in UFS: return value
        if re.fullmatch(r'municipality-\d{7}',value): return value
        if value=='neighborhoods-3547809' or re.fullmatch(r'neighborhood-3547809-[a-z0-9-]+',value): return value
        if re.fullmatch(r'country-[A-Z]{3}',value): return value
        if re.fullmatch(r'country-name-[a-z0-9-]+',value): return value
        if value.startswith('continent-') and value[10:] in {re.sub('[^a-z0-9]+','-',normalize(v)).strip('-') for v in CONTINENTS.values()}: return value
        raise GeographyUnavailable('Receita/provedor não disponível para este recorte. Bairros exigem fonte municipal cadastrada.')

    @contextmanager
    def _lock(self, key):
        folder=self.root/'.locks';folder.mkdir(parents=True,exist_ok=True)
        path=folder/(key+'.lock');deadline=time.monotonic()+90
        while True:
            try:
                fd=os.open(path,os.O_CREAT|os.O_EXCL|os.O_WRONLY);break
            except FileExistsError:
                if time.monotonic()>deadline: raise GeographyUnavailable('Criação deste recorte já está em andamento ou precisa revisão do lock.')
                time.sleep(.05)
        try:
            with os.fdopen(fd,'w') as stream:stream.write(str(os.getpid()))
            yield
        finally:path.unlink(missing_ok=True)

    def _read(self,key):
        pointer=self.root/key/'current.json'
        try:
            selected=json.loads(pointer.read_bytes())
            generation=selected['generation']
            if not re.fullmatch(r'[a-f0-9]{32}',generation):raise ValueError('invalid generation')
            folder=pointer.parent/generation
            manifest=json.loads((folder/'manifest.json').read_bytes())
            if manifest['recipeVersion']!=REVISION or manifest['key']!=key: return None
            if set(manifest['files'])!={'data.json','base.svg'}:raise ValueError('invalid file inventory')
            content={name:(folder/name).read_bytes() for name in manifest['files']}
            if any(digest(content[n])!=h for n,h in manifest['files'].items()):raise ValueError('integrity')
            return {'key':key,'cacheHit':True,'data':json.loads(content['data.json']),'svg':str(folder/'base.svg'),'manifest':manifest,'generation':generation}
        except FileNotFoundError:return None
        except (ValueError,KeyError,TypeError) as exc:raise GeographyUnavailable('Cache geográfico inválido; revisar ou atualizar explicitamente.') from exc

    def _fetch(self,url,sources):
        # URLs are constructed only by known recipes, never supplied by a model.
        request=urllib.request.Request(url,headers={'User-Agent':'Crania-CCR/26.11.2 (public geographic recipes)'})
        try:
            with urllib.request.urlopen(request,timeout=30) as response:
                if urllib.parse.urlsplit(response.url).hostname not in {'servicodados.ibge.gov.br','raw.githubusercontent.com','geo.infrasa.gov.br','sigamapa.santoandre.sp.gov.br'}:
                    raise GeographyUnavailable('Redirecionamento da fonte fora dos provedores declarados.')
                raw=response.read(MAX_BYTES+1)
            if len(raw)>MAX_BYTES:raise GeographyUnavailable('Fonte excede o limite de download.')
            if raw.startswith(b'\x1f\x8b'):
                import io
                with gzip.GzipFile(fileobj=io.BytesIO(raw)) as stream:raw=stream.read(MAX_BYTES+1)
            if len(raw)>MAX_BYTES:raise GeographyUnavailable('Fonte descompactada excede o limite.')
            data=json.loads(raw)
            sources.append({'url':url,'sha256':digest(raw),'bytes':len(raw)})
            return data
        except (OSError,ValueError) as exc:raise GeographyUnavailable('No momento não foi possível obter/validar os dados geográficos da fonte pública.') from exc

    def _brazil(self,key,sources):
        get=lambda u:self._fetch(u,sources)
        state=key[6:] if key.startswith('state-') else None
        municipality=key[13:] if key.startswith('municipality-') else None
        if municipality:
            meta=get(IBGE+'v1/localidades/municipios/'+municipality)
            mesh=get(mesh_url('municipios',municipality))
            features=[feature(municipality,meta['nome'],f['geometry'],level='municipality') for f in mesh['features']]
            if len(features)!=1:raise GeographyUnavailable('Cobertura municipal inesperada.')
            return {'title':meta['nome']+' — limite municipal','attribution':'IBGE — malha municipal simplificada','regions':features,'states':[],'cities':[],'municipalities':features,'countries':[]}
        metadata=get(IBGE+'v1/localidades/estados'+('/'+state if state else ''))
        metadata=[metadata] if state else metadata
        by_code={str(r['id']):r for r in metadata}
        mesh=get(mesh_url('estados' if state else 'paises',state or 'BR',None if state else 'UF'))
        states=[feature(f['properties']['codarea'],by_code[str(f['properties']['codarea'])]['nome'],f['geometry'],uf=by_code[str(f['properties']['codarea'])]['sigla'],region=by_code[str(f['properties']['codarea'])]['regiao']['nome']) for f in mesh['features']]
        if len(states)!=(1 if state else len(metadata)):raise GeographyUnavailable('Cobertura UF incompleta.')
        municipalities=[];cities=[]
        if state:
            rows=get(IBGE+'v1/localidades/estados/'+state+'/municipios')
            names={str(r['id']):r['nome'] for r in rows}
            mesh=get(mesh_url('estados',state,'municipio'))
            municipalities=[feature(f['properties']['codarea'],names[str(f['properties']['codarea'])],f['geometry'],level='municipality',uf=state) for f in mesh['features']]
            if {f['code'] for f in municipalities}!=set(names):raise GeographyUnavailable('Malha não cobre todos os municípios da UF.')
            cities=[[f['name'],state,f['latitude'],f['longitude'],f['code']] for f in municipalities]
        else:
            for offset in range(0,12000,2000):
                query=urllib.parse.urlencode({'where':'1=1','outFields':'geocodigo_,uf,sede_municipal','returnGeometry':'true','outSR':4326,'orderByFields':'objectid','resultOffset':offset,'resultRecordCount':2000,'f':'json'})
                page=get(SEATS+'?'+query)
                if 'error' in page:raise GeographyUnavailable('Catálogo de sedes indisponível.')
                for f in page['features']:
                    a,p=f['attributes'],f['geometry'];cities.append([a['sede_municipal'],a['uf'],p['y'],p['x'],str(a['geocodigo_'])])
                if not page.get('exceededTransferLimit'):break
            else:raise GeographyUnavailable('Paginação da fonte não terminou.')
            if len(cities)<5500 or len({c[4] for c in cities})!=len(cities):raise GeographyUnavailable('Catálogo municipal incompleto/duplicado.')
        return {'title':(states[0]['name']+' — limites municipais') if state else 'Brasil — limites das UFs', 'attribution':'IBGE — malhas simplificadas; sedes públicas Infra S.A.','regions':municipalities or states,'states':states,'cities':cities,'municipalities':municipalities,'countries':[]}

    def _world(self,key,sources):
        def selected(row):
            if key.startswith('country-name-'):
                return key[13:] in {re.sub('[^a-z0-9]+','-',normalize(row.get(k,''))).strip('-') for k in ('code','name','name_en','iso2','iso3') if row.get(k)}
            return row['code']==key[8:] if key.startswith('country-') else re.sub('[^a-z0-9]+','-',normalize(row['continent'])).strip('-')==key[10:]
        existing=self._read('world') if key!='world' else None
        if existing:
            data=copy.deepcopy(existing['data']);sources.extend(data['sources'])
            data['countries']=[r for r in data['countries'] if selected(r)]
            if not data['countries']:raise GeographyUnavailable('Recorte mundial sem geometrias na fonte.')
            data['regions']=data['countries'];data['title']=data['countries'][0]['name'] if key.startswith('country-') else data['countries'][0]['continent']+' — países';return data
        source=self._fetch(WORLD,sources);features=[]
        for item in source['features']:
            p=item['properties'];code=p['ADM0_A3'];continent=CONTINENTS[p['CONTINENT']]
            slug=re.sub('[^a-z0-9]+','-',normalize(continent)).strip('-')
            if key.startswith('country-') and not selected({'code':code,'name':p.get('NAME_PT') or p['ADMIN'],'name_en':p.get('NAME_EN') or p['ADMIN'],'iso2':p['ISO_A2'],'iso3':p['ISO_A3']}):continue
            if key.startswith('continent-') and slug!=key[10:]:continue
            geometry=simplified_geometry(item['geometry'])
            iso3=p['ISO_A3'] if p['ISO_A3']!='-99' else p['ISO_A3_EH'] if p['ISO_A3_EH']==code else ''
            iso2=p['ISO_A2'] if p['ISO_A2']!='-99' else p['ISO_A2_EH'] if iso3 and p['ISO_A2_EH']!='-99' else ''
            features.append(feature(code,p.get('NAME_PT') or p['ADMIN'],geometry,iso2=iso2,iso3=iso3,name_en=p.get('NAME_EN') or p['ADMIN'],continent=continent))
        if not features:raise GeographyUnavailable('Recorte mundial sem geometrias na fonte.')
        return {'title': 'Mundo — fronteiras dos países' if key=='world' else features[0]['continent']+' — países' if key.startswith('continent-') else features[0]['name'], 'attribution':'Natural Earth50m — domínio público; revisão9380cca','regions':features,'countries':features,'states':[],'cities':[],'municipalities':[]}

    def _neighborhoods(self,key,sources):
        if key.startswith('neighborhood-'):
            data=copy.deepcopy(self.ensure('neighborhoods-3547809')['data'])
            wanted=key.removeprefix('neighborhood-3547809-')
            data['regions']=[f for f in data['regions'] if re.sub('[^a-z0-9]+','-',normalize(f['name'])).strip('-')==wanted]
            if len(data['regions'])!=1:raise GeographyUnavailable('Bairro não encontrado/unívoco na fonte municipal.')
            data['title']='Santo André — '+data['regions'][0]['name'];sources.extend(data['sources']);return data
        query=urllib.parse.urlencode({'service':'WFS','version':'1.1.0','request':'GetFeature','typename':'siga:L_3D82645A','outputFormat':'application/json','srsname':'EPSG:4326'})
        source=self._fetch(SIGA+'?'+query,sources)
        rows=source.get('features',[])
        if len(rows)!=112:raise GeographyUnavailable('Cobertura da camada oficial de bairros mudou; revisar provedor SIGA.')
        features=[feature(f['properties']['CODIGO_BAIRRO'],f['properties']['NOME'],f['geometry'],level='neighborhood',municipality='3547809') for f in rows]
        if len({f['code'] for f in features})!=len(features):raise GeographyUnavailable('Bairros duplicados na fonte.')
        return {'title':'Santo André — limites dos112 bairros oficiais','attribution':'Prefeitura de Santo André — SIGA, bairros oficiais; crédito e política municipal de dados abertos','regions':features,'states':[],'cities':[],'municipalities':[],'countries':[]}

    def ensure(self,key,*,refresh=False):
        key=self.key(key)
        if not refresh:
            current=self._read(key)
            if current and current['manifest'].get('drawingVersion')==DRAWING_VERSION:return current
        with self._lock(key):
            if not refresh:
                current=self._read(key)
                if current:
                    if current['manifest'].get('drawingVersion')==DRAWING_VERSION:return current
                    return self._publish(key,current['data'],current['data']['sources'],cache_hit=True)
            sources=[]
            try:
                data=(self._world(key,sources) if key=='world' or key.startswith(('country-','continent-')) else self._neighborhoods(key,sources) if key.startswith('neighborhood') else self._brazil(key,sources))
                data.update({'obtainedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sources':sources,'recipeVersion':REVISION,'key':key})
                return self._publish(key,data,sources)
            except GeographyUnavailable:raise
            except (OSError,ValueError,KeyError,TypeError,AssertionError) as exc:raise GeographyUnavailable('Não foi possível criar este recorte; fonte/estrutura precisa revisão. Cache válido anterior preservado.') from exc

    def _publish(self,key,data,sources,*,cache_hit=False):
        svg,transform=render_svg(data['title'],data['regions'],country_crop=key.startswith('country-'),region_labels=key=='brazil',attribution=data['attribution'])
        data['transform']=transform
        folder=self.root/key/uuid.uuid4().hex;folder.mkdir(parents=True)
        files={'data.json':encode(data),'base.svg':svg.encode('utf8')}
        for name,raw in files.items():(folder/name).write_bytes(raw)
        license_note=('Natural Earth: public domain' if data['countries'] else 'Prefeitura de Santo André/SIGA: dados públicos; seguir política municipal de dados abertos' if key.startswith('neighborhood') else 'IBGE/Infra S.A.: dados públicos; preservar crédito e termos da fonte')
        manifest={'key':key,'recipeVersion':REVISION,'drawingVersion':DRAWING_VERSION,'obtainedAt':data['obtainedAt'],'sources':sources,'attribution':data['attribution'],'license':license_note,'files':{n:digest(r) for n,r in files.items()}}
        (folder/'manifest.json').write_bytes(encode(manifest))
        pointer=folder.parent/(folder.name+'.pointer');pointer.write_bytes(encode({'generation':folder.name}));os.replace(pointer,folder.parent/'current.json')
        result=self._read(key);result['cacheHit']=cache_hit;return result

    def png(self,key):
        import fitz
        result=self.ensure(key);source=Path(result['svg']);target=source.with_suffix('.png')
        with self._lock(key+'-png'):
            receipt=target.with_suffix('.png.json');valid=False
            if target.is_file() and receipt.is_file():
                try:
                    record=json.loads(receipt.read_bytes());valid=record['svg']==result['manifest']['files']['base.svg'] and record['png']==digest(target.read_bytes())
                except (ValueError,KeyError):pass
            if not valid:
                temporary=target.with_name(uuid.uuid4().hex+'.png')
                with fitz.open(stream=source.read_bytes(),filetype='svg') as document:document[0].get_pixmap(alpha=False).save(temporary)
                os.replace(temporary,target)
                receipt.write_bytes(encode({'svg':result['manifest']['files']['base.svg'],'png':digest(target.read_bytes())}))
        return {**result,'png':str(target)}

    def lookup(self,names,*,kind='city',state=None):
        if kind not in ('city','state','country','continent','neighborhood') or not isinstance(names,list) or not names or any(not isinstance(n,str) or not n.strip() for n in names):raise ValueError('Informe uma lista de nomes e nível geográfico suportado.')
        slug=lambda value:re.sub('[^a-z0-9]+','-',normalize(value)).strip('-')
        key=('state-'+state.upper()) if state and kind=='city' else 'brazil' if kind in ('city','state') else 'neighborhoods-3547809' if kind=='neighborhood' else 'continent-'+slug(names[0]) if kind=='continent' and len(names)==1 else 'country-name-'+slug(names[0]) if kind=='country' and len(names)==1 else 'world'
        entry=self.ensure(key)
        tables=_lookup_index(str(Path(entry['svg']).with_name('data.json')),entry['manifest']['files']['data.json']);results=[]
        for name in names:
            term=normalize(name)
            rows=tables[kind].get(term,[])
            results.append({'requested':name,'status':'ready' if rows and (len(rows)==1 or kind=='continent') else 'ambiguous' if rows else 'unknown','matches':copy.deepcopy(rows)})
        return results
