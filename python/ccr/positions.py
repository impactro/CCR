"""Bounded offline position maps. No lookup, tracking, tiles or transport."""
import hashlib
import html
import json
import math
import re
from pathlib import Path


def _point(row):
    point = []
    for key, bound in (('latitude', 90), ('longitude', 180)):
        value = row.get(key)
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or abs(value) > bound:
            raise ValueError('Coordenadas inválidas no mapa de posições.')
        point.append(float(value))
    return point


def position_svg(spec):
    if not isinstance(spec, dict) or set(spec) - {'type', 'center', 'radiusMeters', 'points', 'ready', 'minimumPoints'}:
        raise ValueError('Mapa de posições inválido.')
    origin = _point(spec['center'])
    radius = spec.get('radiusMeters', 5000)
    points = spec.get('points')
    if isinstance(radius, bool) or not isinstance(radius, (int, float)) or not math.isfinite(radius) or not 1 <= radius <= 100000:
        raise ValueError('Raio inválido.')
    if not isinstance(points, list) or not 5 <= len(points) <= 100:
        raise ValueError('O mapa exige de cinco a cem pontos; use a lista quando faltar cobertura.')
    lat1, lon1 = map(math.radians, origin)
    marks = []; legend = []; seen = set()
    for index, row in enumerate(points, 1):
        lat, lon = _point(row)
        identity = row.get('conversationId')
        if identity and identity in seen:
            raise ValueError('Contato duplicado no mapa.')
        if identity: seen.add(identity)
        lat2, lon2 = map(math.radians, (lat, lon))
        delta = lon2 - lon1
        a = math.sin((lat2-lat1)/2)**2 + math.cos(lat1)*math.cos(lat2)*math.sin(delta/2)**2
        distance = 6371008.8*2*math.asin(math.sqrt(min(1, max(0, a))))
        if distance > radius + .01:
            raise ValueError('Ponto fora do raio declarado.')
        bearing = math.atan2(math.sin(delta)*math.cos(lat2), math.cos(lat1)*math.sin(lat2)-math.sin(lat1)*math.cos(lat2)*math.cos(delta))
        x = 330 + 275*distance/radius*math.sin(bearing)
        y = 340 - 275*distance/radius*math.cos(bearing)
        raw_label = str(row.get('label') or f'Cliente {index}')[:120]
        label = html.escape(raw_label)
        url = f'https://www.google.com/maps/search/?api=1&amp;query={lat},{lon}'
        marks.append(f'<a href="{url}" target="_blank"><title>{label} · {round(distance)} m</title><circle cx="{x:.2f}" cy="{y:.2f}" r="12" fill="#17695a"/><text x="{x:.2f}" y="{y+4:.2f}" text-anchor="middle" font-size="11" fill="white">{index}</text></a>')
        legend.append(f'<a href="{url}" target="_blank"><text x="650" y="{95+index*23}" font-size="13" fill="#163c36">{index}. {html.escape(raw_label[:65])} · {round(distance)} m</text></a>')
    height = max(720, 150 + len(points)*23)
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="{height}" viewBox="0 0 1200 {height}"><rect width="1200" height="{height}" fill="#f8fbf9"/><g font-family="Arial, sans-serif"><text x="30" y="35" font-size="24" fill="#153c34">Clientes nos arredores · raio de {radius/1000:g} km</text><text x="30" y="58" font-size="13">Norte ↑ · distância em linha reta · mapa esquemático sem base viária</text><circle cx="330" cy="340" r="275" fill="#e8f2ed" stroke="#698e80" stroke-dasharray="7 5"/><path d="M55 340H605M330 65V615" stroke="#b7cfc3"/><circle cx="330" cy="340" r="8" fill="#c9413c"/><text x="345" y="333" font-size="13">Posição recebida</text>{"".join(marks)}{"".join(legend)}<text x="30" y="{height-25}" font-size="12">Pontos de cadastro aproximados. Não representa trajeto, tempo de viagem ou localização atual dos clientes.</text></g></svg>'
    return svg, origin


def export_positions(root, source, output):
    root = Path(root).resolve()
    def scoped(path):
        p = Path(path); p = (root/p).resolve() if not p.is_absolute() else p.resolve()
        if not any(p.is_relative_to((root/name).resolve()) for name in ('temp', 'outputs')):
            raise ValueError('Dados e saída devem ficar em temp/ ou outputs/ da raiz autorizada.')
        return p
    source, output = scoped(source), scoped(output)
    if source.stat().st_size > 200000 or output.suffix.lower() != '.png':
        raise ValueError('Informe JSON de até 200 KB e saída PNG nova.')
    targets = [output, output.with_suffix('.svg'), output.with_suffix('.html'), output.with_suffix('.manifest.json')]
    if any(p.exists() for p in targets): raise ValueError('A exportação não sobrescreve arquivos.')
    spec = json.loads(source.read_text(encoding='utf-8-sig'))
    svg, (lat, lon) = position_svg(spec)
    import pymupdf
    # MuPDF ignores SVG anchor subtrees; unwrap links for raster only, retaining
    # the exact same marks/labels and the clickable originals in SVG/HTML.
    raster_svg = re.sub(r'<a\b[^>]*>|</a>', '', svg)
    with pymupdf.open(stream=raster_svg.encode('utf-8'), filetype='svg') as document:
        png = document[0].get_pixmap(alpha=False).tobytes('png')
    osm = f'https://www.openstreetmap.org/?mlat={lat}&mlon={lon}#map=13/{lat}/{lon}'
    page = '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Clientes nos arredores</title><body><p><a href="'+osm+'" target="_blank" rel="noopener noreferrer">Abrir centro no OpenStreetMap</a> · Clique em cada ponto para abrir o Google Maps.</p>'+svg+'</body></html>'
    bodies = [png, svg.encode('utf-8'), page.encode('utf-8')]
    manifest = {'type':'position','radiusMeters':spec.get('radiusMeters',5000),'points':len(spec['points']),
                'basemap':False,'sent':False,'files':[{'path':str(p),'sha256':hashlib.sha256(data).hexdigest()} for p,data in zip(targets,bodies)]}
    output.parent.mkdir(parents=True, exist_ok=True)
    # Exclusive creation also refuses concurrent writers; cleanup only our partial files.
    created = []
    try:
        for p, data in zip(targets, bodies + [(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n').encode('utf-8')]):
            with p.open('xb') as stream:
                created.append(p); stream.write(data)
    except OSError:
        for p in created: p.unlink(missing_ok=True)
        raise
    return manifest
