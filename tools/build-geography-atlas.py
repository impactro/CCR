"""Build the offline public atlas and ready-to-query index from CCR data."""
from __future__ import annotations

import csv
import hashlib
import json
import math
import re
import unicodedata
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parents[1]


def normalize(value):
    value = ''.join(c for c in unicodedata.normalize('NFD', str(value)).lower() if not unicodedata.combining(c))
    return re.sub(r'\s+', ' ', value.replace("'", '').replace('’', '')).strip()


def project(lon, lat):
    lat = max(-85, min(85, lat))
    return lon, -math.degrees(math.log(math.tan(math.pi / 4 + math.radians(lat) / 2)))


def polygons(geometry):
    return [geometry['coordinates']] if geometry['type'] == 'Polygon' else geometry['coordinates']


def area(ring):
    points = [project(*p) for p in ring]
    return abs(sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(points, points[1:])))


def render_svg(title, features, cities=(), *, country_crop=False, region_labels=False):
    rings = [ring for feature in features for polygon in polygons(feature['geometry']) for ring in polygon]
    crop = max((polygon[0] for feature in features for polygon in polygons(feature['geometry'])), key=area) if country_crop else None
    points = [project(*p) for ring in ([crop] if crop else rings) for p in ring]
    x0, x1 = min(p[0] for p in points), max(p[0] for p in points)
    y0, y1 = min(p[1] for p in points), max(p[1] for p in points)
    scale = min(1120 / max(x1 - x0, .01), 650 / max(y1 - y0, .01))
    ox, oy = 600 - (x0 + x1) * scale / 2, 425 - (y0 + y1) * scale / 2

    def point(lon, lat):
        x, y = project(lon, lat)
        return x * scale + ox, y * scale + oy

    body = []
    for feature in features:
        commands = []
        for polygon in polygons(feature['geometry']):
            for ring in polygon:
                pts = [point(*p) for p in ring]
                commands.append('M' + 'L'.join(f'{x:.3f},{y:.3f}' for x, y in pts) + 'Z')
        code = str(feature.get('uf') or feature.get('code'))
        body.append(f'<path data-region="{escape(code)}" d="{"".join(commands)}" fill="#e5eee9" stroke="#657f85" stroke-width=".8" fill-rule="evenodd"><title>{escape(feature["name"])}</title></path>')
        if region_labels:
            x, y = point(feature['longitude'], feature['latitude'])
            body.append(f'<text x="{x:.2f}" y="{y:.2f}" text-anchor="middle" font-size="12" fill="#173247">{escape(code)}</text>')
    for city in cities:
        x, y = point(city['longitude'], city['latitude'])
        body.append(f'<circle data-ibge="{city["ibge_code"]}" cx="{x:.3f}" cy="{y:.3f}" r="2" fill="#007c91"><title>{escape(city["name"])}/{city["state"]} · IBGE {city["ibge_code"]}</title></circle>')
    note = ('Sedes municipais de referência; não são limites municipais nem GPS de clientes.' if cities
            else 'Base cartográfica pública; sem dados ou quantidades de clientes.')
    if country_crop:
        note += ' Enquadramento na parte principal do país; geometrias completas no catálogo.'
    svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" role="img">'
           f'<title>{escape(title)}</title><rect width="1200" height="800" fill="#edf5fa"/>'
           f'<text x="32" y="45" font-family="sans-serif" font-size="25" fill="#173247">{escape(title)}</text>'
           '<defs><clipPath id="map"><rect x="24" y="70" width="1152" height="680"/></clipPath></defs>'
           '<g clip-path="url(#map)" font-family="sans-serif">' + ''.join(body) + '</g>'
           f'<text x="24" y="778" font-family="sans-serif" font-size="12" fill="#36545b">{escape(note)}</text></svg>\n')
    return svg, {'projection': 'Mercator-clamped-85', 'scale': scale, 'offsetX': ox, 'offsetY': oy,
                 'viewBox': [0, 0, 1200, 800], 'crop': 'principal' if country_crop else 'all'}


def build(root=ROOT):
    data = root / 'data/geography'
    brazil = json.loads((root / 'src/geography-brazil.json').read_text('utf-8'))
    world = json.loads((root / 'src/geography-world.json').read_text('utf-8'))
    tables = {}
    for kind, filename in [('cities', 'cities-br.csv'), ('states', 'states-br.csv'), ('countries', 'countries.csv')]:
        with (data / filename).open(encoding='utf-8', newline='') as stream:
            rows = list(csv.DictReader(stream))
        for row in rows:
            for key in ('latitude', 'longitude'):
                row[key] = float(row[key])
        tables[kind] = rows
    lookup = {'schemaVersion': 1, **tables, 'cityNames': {}, 'cityCodes': {}, 'stateNames': {}, 'countryNames': {}, 'continents': {}}
    for i, row in enumerate(tables['cities']):
        lookup['cityNames'].setdefault(normalize(row['name']), []).append(i)
        lookup['cityCodes'][row['ibge_code']] = i
    for i, row in enumerate(tables['states']):
        for key in (row['name'], row['state'], row['ibge_code']):
            lookup['stateNames'][normalize(key)] = i
    for i, row in enumerate(tables['countries']):
        for key in sorted({row[k] for k in ('name', 'name_en', 'natural_earth_code', 'iso2', 'iso3') if row[k]}):
            found = lookup['countryNames'].setdefault(normalize(key), [])
            if i not in found: found.append(i)
        lookup['continents'].setdefault(normalize(row['continent']), []).append(i)
    index_file = data / 'geography-index.json'
    index_file.write_text(json.dumps(lookup, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    atlas = data / 'atlas'; atlas.mkdir(exist_ok=True)
    manifest = {'schemaVersion': 1, 'hashNormalization': 'LF', 'obtainedAt': brazil['obtainedAt'],
                'inputs': {name: hashlib.sha256((root / name).read_bytes().replace(b'\r\n', b'\n')).hexdigest() for name in
                           ('src/geography-brazil.json', 'src/geography-world.json', 'data/geography/cities-br.csv', 'data/geography/states-br.csv', 'data/geography/countries.csv')},
                'assets': {}}

    def asset(identity, title, features, cities=(), **options):
        svg, transform = render_svg(title, features, cities, **options)
        filename = identity + '.svg'; raw = svg.encode('utf-8'); (atlas / filename).write_bytes(raw)
        manifest['assets'][identity] = {'file': filename, 'title': title, 'regions': len(features),
                                       'municipalSeats': len(cities), 'sha256': hashlib.sha256(raw).hexdigest(), **transform}
    asset('br-states', 'Brasil — estados e Distrito Federal', brazil['states'], region_labels=True)
    for state in brazil['states']:
        cities = [city for city in tables['cities'] if city['state'] == state['uf']]
        asset('br-' + state['uf'] + '-cities', state['name'] + ' — sedes municipais', [state], cities)
    asset('world-countries', 'Mundo — países e territórios', world['countries'])
    for country in world['countries']:
        asset('country-' + country['code'], country['name'], [country], country_crop=True)
    for continent in sorted({c['continent'] for c in world['countries']}):
        slug = re.sub(r'[^a-z0-9]+', '-', normalize(continent)).strip('-')
        asset('continent-' + slug, continent + ' — países e territórios', [c for c in world['countries'] if c['continent'] == continent])
    (atlas / 'index.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'assets': len(manifest['assets']), 'cities': len(tables['cities']),
                      'bytes': sum(p.stat().st_size for p in atlas.iterdir()), 'indexBytes': index_file.stat().st_size}))
    return manifest


if __name__ == '__main__':
    build()
