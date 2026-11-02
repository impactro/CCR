"""Refresh only public Brazilian cartography; never run during rendering."""
import datetime
import csv
import gzip
import hashlib
import json
from pathlib import Path
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
MESH = 'https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?intrarregiao=UF&formato=application/vnd.geo%2Bjson&qualidade=minima'
STATES = 'https://servicodados.ibge.gov.br/api/v1/localidades/estados'
CITIES = 'https://geo.infrasa.gov.br/server/rest/services/Hosted/Sedes_Municipais/FeatureServer/17/query'
WORLD = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/9380cca83db5f9aef52d5e762765100745f84b27/geojson/ne_50m_admin_0_countries.geojson'
sources = []


def get(url):
    with urllib.request.urlopen(url, timeout=30) as response:
        data = response.read(5_000_001)
    if len(data) > 5_000_000:
        raise ValueError('Public source exceeds build bound')
    if data.startswith(b'\x1f\x8b'):
        data = gzip.decompress(data)
    sources.append({'url': url, 'sha256': hashlib.sha256(data).hexdigest()})
    return json.loads(data)


def rounded(value):
    if isinstance(value, list):
        return [rounded(item) for item in value]
    return round(value, 5) if isinstance(value, float) else value


def center(geometry):
    polygons = [geometry['coordinates']] if geometry['type'] == 'Polygon' else geometry['coordinates']
    total = xsum = ysum = 0
    for polygon in polygons:
        ring = polygon[0]
        cross = [a[0]*b[1]-b[0]*a[1] for a,b in zip(ring,ring[1:])]
        area = sum(cross)
        if not area:
            continue
        x = sum((a[0]+b[0])*v for a,b,v in zip(ring,ring[1:],cross))/(3*area)
        y = sum((a[1]+b[1])*v for a,b,v in zip(ring,ring[1:],cross))/(3*area)
        weight = abs(area)
        total += weight; xsum += x*weight; ysum += y*weight
    assert total
    return round(ysum/total,5),round(xsum/total,5)


def simplify_ring(points, tolerance=0.03):
    """Bound coastline detail at build time; preserve closed rings/country identity."""
    if len(points)<=4:
        return points
    keep={0,len(points)-1};stack=[(0,len(points)-1)]
    while stack:
        first,last=stack.pop();a,b=points[first],points[last]
        vx,vy=b[0]-a[0],b[1]-a[1];length=vx*vx+vy*vy;furthest=None;maximum=tolerance*tolerance
        for index in range(first+1,last):
            p=points[index];ratio=max(0,min(1,((p[0]-a[0])*vx+(p[1]-a[1])*vy)/length)) if length else 0
            distance=(p[0]-a[0]-ratio*vx)**2+(p[1]-a[1]-ratio*vy)**2
            if distance>maximum:maximum=distance;furthest=index
        if furthest is not None:keep.add(furthest);stack.extend(((first,furthest),(furthest,last)))
    result=[points[index] for index in sorted(keep)]
    return result if len(result)>=4 else points


def simplified_geometry(geometry):
    polygons=[geometry['coordinates']] if geometry['type']=='Polygon' else geometry['coordinates']
    simplified=[[simplify_ring(ring) for ring in polygon] for polygon in polygons]
    return {'type':geometry['type'],'coordinates':rounded(simplified[0] if geometry['type']=='Polygon' else simplified)}


data_root = ROOT/'data/geography'


def csv_file(name, fields, rows):
    path = data_root/name
    with path.open('w',encoding='utf-8',newline='') as f:
        writer=csv.DictWriter(f,fields,lineterminator='\n');writer.writeheader();writer.writerows(rows)
    # Compiled names/coordinates derive only from these canonical CSV bytes.
    with path.open(encoding='utf-8',newline='') as f:
        return list(csv.DictReader(f))


def build(root=ROOT):
    global ROOT, data_root, sources
    ROOT = Path(root).resolve()
    data_root = ROOT / 'data/geography'
    data_root.mkdir(parents=True, exist_ok=True)
    (ROOT / 'src').mkdir(parents=True, exist_ok=True)
    sources = []
    mesh, metadata = get(MESH), get(STATES)
    by_code = {str(item['id']): item for item in metadata}
    assert len(by_code) == len(mesh['features']) == 27
    states = []
    for feature in mesh['features']:
        state = by_code[str(feature['properties']['codarea'])]
        geometry = feature['geometry']
        assert geometry['type'] in ('Polygon', 'MultiPolygon')
        states.append({'uf': state['sigla'], 'name': state['nome'],
                       'code':str(state['id']),
                       'region': state['regiao']['nome'],
                       'geometry': rounded(geometry) if isinstance(geometry, list) else
                       {'type': geometry['type'], 'coordinates': rounded(geometry['coordinates'])}})
    cities = []
    for offset in range(0, 12_000, 2000):
        query = urllib.parse.urlencode({'where': '1=1', 'outFields': 'geocodigo_,uf,sede_municipal',
            'returnGeometry': 'true', 'outSR': 4326, 'orderByFields': 'objectid',
            'resultOffset': offset, 'resultRecordCount': 2000, 'f': 'json'})
        page = get(CITIES + '?' + query)
        assert 'error' not in page
        for feature in page['features']:
            attrs, point = feature['attributes'], feature['geometry']
            assert attrs['uf'] in {item['uf'] for item in states}
            assert -90 <= point['y'] <= 90 and -180 <= point['x'] <= 180
            cities.append([attrs['sede_municipal'], attrs['uf'], round(point['y'], 5),
                           round(point['x'], 5), str(attrs['geocodigo_'])])
        if not page.get('exceededTransferLimit'):
            break
    else:
        raise ValueError('Public city pagination did not end')
    assert 5500 <= len(cities) <= 6000
    assert len({city[4] for city in cities}) == len(cities)
    city_rows=csv_file('cities-br.csv',['ibge_code','name','state','country','latitude','longitude','reference'],[
        dict(zip(['name','state','latitude','longitude','ibge_code'],c),country='BR',reference='municipal_seat') for c in sorted(cities,key=lambda c:c[4])])
    state_rows=[]
    for s in states:
        lat,lon=center(s['geometry'])
        state_rows.append({'ibge_code':s['code'],'name':s['name'],'state':s['uf'],'country':'BR','region':s['region'],'latitude':lat,'longitude':lon,'reference':'geometry_centroid'})
    state_rows=csv_file('states-br.csv',['ibge_code','name','state','country','region','latitude','longitude','reference'],sorted(state_rows,key=lambda s:s['ibge_code']))
    states=[{**next(s for s in states if s['uf']==r['state']), 'name':r['name'],'latitude':float(r['latitude']),'longitude':float(r['longitude'])} for r in state_rows]
    cities=[[r['name'],r['state'],float(r['latitude']),float(r['longitude']),r['ibge_code']] for r in city_rows]
    world=get(WORLD)
    continents={'Europe':'Europa','Asia':'Ásia','Africa':'África','North America':'América do Norte','South America':'América do Sul','Oceania':'Oceania','Antarctica':'Antártida','Seven seas (open ocean)':'Ilhas oceânicas'}
    country_rows=[];geometries={}
    for f in world['features']:
        p=f['properties'];code=p['ADM0_A3'];geometries[code]=simplified_geometry(f['geometry'])
        iso3=p['ISO_A3'] if p['ISO_A3']!='-99' else p['ISO_A3_EH'] if p['ISO_A3_EH']==code else ''
        iso2=p['ISO_A2'] if p['ISO_A2']!='-99' else p['ISO_A2_EH'] if iso3 and p['ISO_A2_EH']!='-99' else ''
        country_rows.append({'natural_earth_code':code,'iso2':iso2,'iso3':iso3,'name':p.get('NAME_PT') or p['ADMIN'],'name_en':p.get('NAME_EN') or p['ADMIN'],'continent':continents[p['CONTINENT']],'latitude':p['LABEL_Y'],'longitude':p['LABEL_X'],'reference':'cartographic_label'})
    country_rows=csv_file('countries.csv',['natural_earth_code','iso2','iso3','name','name_en','continent','latitude','longitude','reference'],sorted(country_rows,key=lambda r:r['natural_earth_code']))
    assert len({r['natural_earth_code'] for r in country_rows})==len(country_rows)==242
    countries=[{'code':r['natural_earth_code'],'iso2':r['iso2'],'iso3':r['iso3'],'name':r['name'],'name_en':r['name_en'],'continent':r['continent'],'latitude':float(r['latitude']),'longitude':float(r['longitude']),'geometry':geometries[r['natural_earth_code']]} for r in country_rows]
    payload = {'attribution': 'IBGE — malhas UF; sedes municipais disponibilizadas pela Infra S.A.',
               'obtainedAt': datetime.date.today().isoformat(), 'sources': sources,
               'states': sorted(states, key=lambda item: item['uf']),
               'cities': sorted(cities, key=lambda item: item[4])}
    target = ROOT / 'src' / 'geography-brazil.json'
    target.write_text(json.dumps(payload, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    world_payload={'attribution':'Natural Earth — países e territórios, domínio público','countries':countries,'source':sources[-1],'obtainedAt':payload['obtainedAt'],'geometryTransform':{'algorithm':'Ramer-Douglas-Peucker','toleranceDegrees':0.03,'coordinateDecimals':5}}
    (ROOT/'src/geography-world.json').write_text(json.dumps(world_payload,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
    manifest={'obtainedAt':payload['obtainedAt'],'sources':sources,'license':{'ibge':'Dados públicos; crédito IBGE e Infra S.A.','naturalEarth':'Public domain — https://www.naturalearthdata.com/about/terms-of-use/'},'files':{p.name:{'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'rows':len(city_rows) if p.name=='cities-br.csv' else len(state_rows) if p.name=='states-br.csv' else len(country_rows)} for p in data_root.glob('*.csv')}}
    (data_root/'sources.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'states': len(states), 'cities': len(cities), 'bytes': target.stat().st_size,
                      'sha256': hashlib.sha256(target.read_bytes()).hexdigest()}))


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=ROOT, help='Destination root for public CSV and compiled JSON.')
    build(parser.parse_args().root)
