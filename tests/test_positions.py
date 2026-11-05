import json
from pathlib import Path
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'python'))
from ccr.positions import position_svg, export_positions


def spec():
    return {'type':'position','center':{'latitude':0,'longitude':0},'radiusMeters':5000,
        'points':[{'conversationId':str(i),'latitude':i*.003,'longitude':i*.002,'label':f'Cliente {i} & <teste>'} for i in range(5)]}


class PositionTests(unittest.TestCase):
    def test_real_png_and_clickable_svg_html_without_network(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);(root/'temp').mkdir()
            source=root/'temp/map.json';source.write_text(json.dumps(spec()),encoding='utf-8')
            target=root/'outputs/map.png';result=export_positions(root,source,target)
            self.assertEqual(result['points'],5)
            self.assertTrue(target.read_bytes().startswith(b'\x89PNG'))
            import pymupdf
            pix=pymupdf.Pixmap(str(target));pixels=pix.samples
            self.assertGreater(sum(pixels[i:i+3]==bytes((23,105,90)) for i in range(0,len(pixels),pix.n)),1000)
            ET.fromstring(target.with_suffix('.svg').read_text(encoding='utf-8'))
            html=target.with_suffix('.html').read_text(encoding='utf-8')
            self.assertIn('openstreetmap.org',html);self.assertIn('google.com/maps',html)
            self.assertNotIn('<script',html);self.assertNotIn('<img',html)
            with self.assertRaises(ValueError): export_positions(root,source,target)

    def test_insufficient_or_invalid_points_never_make_a_map(self):
        cases=[]
        item=spec();item['points']=item['points'][:4];cases.append(item)
        item=spec();item['points'][0]['latitude']=True;cases.append(item)
        item=spec();item['points'][0]['longitude']=20;cases.append(item)
        item=spec();item['points'][1]['conversationId']='0';cases.append(item)
        for item in cases:
            with self.assertRaises(ValueError):position_svg(item)

    def test_output_cannot_escape_authorized_workspace(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);(root/'temp').mkdir()
            source=root/'temp/map.json';source.write_text(json.dumps(spec()),encoding='utf-8')
            with self.assertRaises(ValueError):export_positions(root,source,root/'other/map.png')
