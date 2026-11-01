"""Public source CSV and compiled data consistency; no network or private data."""
import csv
import hashlib
import json
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parents[1]

class GeographyDataTest(unittest.TestCase):
    def test_csv_is_the_compiled_name_and_coordinate_source(self):
        base=ROOT/'data/geography'
        manifest=json.loads((base/'sources.json').read_text(encoding='utf-8'))
        brazil=json.loads((ROOT/'src/geography-brazil.json').read_text(encoding='utf-8'))
        world=json.loads((ROOT/'src/geography-world.json').read_text(encoding='utf-8'))
        tables={}
        for name,meta in manifest['files'].items():
            path=base/name
            self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(),meta['sha256'])
            with path.open(encoding='utf-8',newline='') as f:tables[name]=list(csv.DictReader(f))
            self.assertEqual(len(tables[name]),meta['rows'])
            for row in tables[name]:
                self.assertTrue(-90<=float(row['latitude'])<=90)
                self.assertTrue(-180<=float(row['longitude'])<=180)
        self.assertEqual(brazil['cities'],[[r['name'],r['state'],float(r['latitude']),float(r['longitude']),r['ibge_code']] for r in tables['cities-br.csv']])
        states={s['code']:s for s in brazil['states']}
        for r in tables['states-br.csv']:
            s=states[r['ibge_code']]
            self.assertEqual((s['name'],s['uf'],s['latitude'],s['longitude']),(r['name'],r['state'],float(r['latitude']),float(r['longitude'])))
        countries={c['code']:c for c in world['countries']}
        for r in tables['countries.csv']:
            c=countries[r['natural_earth_code']]
            self.assertEqual((c['name'],c['continent'],c['latitude'],c['longitude']),(r['name'],r['continent'],float(r['latitude']),float(r['longitude'])))

if __name__=='__main__':unittest.main()
