"""Pure vector drawing, with no catalog or network."""
import math,re,unicodedata
from xml.sax.saxutils import escape

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


def render_svg(title, features, cities=(), *, country_crop=False, region_labels=False, values=None, points=()):
    values = values or {}
    maximum = max(values.values(), default=0)
    rings = [ring for feature in features for polygon in polygons(feature['geometry']) for ring in polygon]
    crop = max((polygon[0] for feature in features for polygon in polygons(feature['geometry'])), key=area) if country_crop else None
    extent = [project(*p) for ring in ([crop] if crop else rings) for p in ring]
    x0, x1 = min(p[0] for p in extent), max(p[0] for p in extent)
    y0, y1 = min(p[1] for p in extent), max(p[1] for p in extent)
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
        code = str(feature.get('code') or feature.get('uf'))
        ratio = values.get(code, 0) / max(1, maximum)
        fill = f'rgb({int(225-190*ratio)},{int(239-105*ratio)},{int(235-90*ratio)})' if code in values else '#e5eee9'
        label = feature['name'] + (': ' + str(values[code]) if code in values else '')
        body.append(f'<path data-region="{escape(code)}" d="{"".join(commands)}" fill="{fill}" stroke="#657f85" stroke-width=".8" fill-rule="evenodd"><title>{escape(label)}</title></path>')
        if region_labels:
            x, y = point(feature['longitude'], feature['latitude'])
            body.append(f'<text x="{x:.2f}" y="{y:.2f}" text-anchor="middle" font-size="12" fill="#173247">{escape(str(feature.get("uf") or code))}</text>')
    for city in cities:
        x, y = point(city['longitude'], city['latitude'])
        body.append(f'<circle data-ibge="{city["ibge_code"]}" cx="{x:.3f}" cy="{y:.3f}" r="2" fill="#007c91"><title>{escape(city["name"])}/{city["state"]} · IBGE {city["ibge_code"]}</title></circle>')
    for item in points:
        x,y=point(item['longitude'],item['latitude'])
        body.append(f'<circle cx="{x:.3f}" cy="{y:.3f}" r="4" fill="#b53e19" stroke="#fff"><title>{escape(str(item.get("label") or "GPS fornecido"))}</title></circle>')
    if values:
        body.append(f'<text x="30" y="728" font-size="14" fill="#173247">Valor: 0 a {maximum}; sem dado: neutro. {len(values)} regiões quantificadas.</text>')
    note = ('Sedes municipais de referência; não são limites municipais nem GPS de clientes.' if cities
            else 'Fronteiras públicas; valores/GPS fornecidos pelo chamador.' if values or points else 'Base cartográfica pública; sem dados ou quantidades de clientes.')
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

