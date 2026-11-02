import hashlib
import importlib.util
import json
import unittest
from pathlib import Path
from unittest.mock import patch
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
NS = {'svg': 'http://www.w3.org/2000/svg'}


class GeographyAtlasTest(unittest.TestCase):
    def test_atlas_has_every_state_country_and_municipal_seat_with_integral_svg(self):
        base = ROOT / 'data/geography'
        atlas = json.loads((base / 'atlas/index.json').read_text('utf-8'))
        catalog = json.loads((base / 'geography-index.json').read_text('utf-8'))
        self.assertEqual(len(atlas['assets']), 2 + 27 + len(catalog['countries']) + len(catalog['continents']))
        seats = set()
        for identity, asset in atlas['assets'].items():
            raw = (base / 'atlas' / asset['file']).read_bytes().replace(b'\r\n', b'\n')
            self.assertEqual(hashlib.sha256(raw).hexdigest(), asset['sha256'])
            tree = ET.fromstring(raw)
            self.assertEqual(tree.attrib['viewBox'], '0 0 1200 800')
            self.assertFalse(tree.findall('.//svg:script', NS))
            self.assertFalse(tree.findall('.//svg:image', NS))
            for node in tree.iter():
                self.assertFalse(any(k.lower().startswith('on') or k.endswith('href') for k in node.attrib))
            circles = tree.findall('.//svg:circle', NS)
            self.assertEqual(len(circles), asset['municipalSeats'])
            if identity.startswith('br-'):
                seats.update(c.attrib['data-ibge'] for c in circles)
        self.assertEqual(seats, {city['ibge_code'] for city in catalog['cities']})
        self.assertEqual(atlas['assets']['br-SP-cities']['municipalSeats'], 645)

    def test_atlas_inputs_are_tracked_and_lookup_keeps_homonyms(self):
        base = ROOT / 'data/geography'
        atlas = json.loads((base / 'atlas/index.json').read_text('utf-8'))
        for filename, expected in atlas['inputs'].items():
            self.assertEqual(hashlib.sha256((ROOT / filename).read_bytes().replace(b'\r\n', b'\n')).hexdigest(), expected)
        catalog = json.loads((base / 'geography-index.json').read_text('utf-8'))
        self.assertEqual(len(catalog['cityCodes']), 5570)
        self.assertGreater(len(catalog['cityNames']['bom jesus']), 1)
        self.assertEqual(catalog['cities'][catalog['cityCodes']['3526902']]['name'], 'Limeira')

    def test_downloader_import_has_no_network_or_creation_side_effect(self):
        spec = importlib.util.spec_from_file_location('ccr_geography_downloader', ROOT / 'tools/build-geography.py')
        value = importlib.util.module_from_spec(spec)
        with patch('urllib.request.urlopen', side_effect=AssertionError('unexpected network')):
            spec.loader.exec_module(value)
        self.assertTrue(callable(value.build))


if __name__ == '__main__':
    unittest.main()
