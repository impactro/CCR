"""Synthetic boundaries only: no external network or downloaded fixture datasets."""
import io,json,sys,tempfile,time,unittest
from concurrent.futures import ThreadPoolExecutor
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'python'))
from ccr import GeographyCache,GeographyUnavailable
from ccr.cli import main
from ccr.cm import describe
from ccr.geography import _lookup_index,validate_geometry

def polygon(x=0):return {'type':'Polygon','coordinates':[[[x,0],[x+1,0],[x+1,1],[x,1],[x,0]]]}
def synthetic(cache,url,sources):
    sources.append({'url':url,'sha256':'a'*64})
    if '/v1/localidades/estados/SP/municipios' in url:return [{'id':3500001,'nome':'Cidade Alfa'},{'id':3500002,'nome':'Cidade Beta'}]
    if '/v1/localidades/estados/SP' in url:return {'id':35,'nome':'São Paulo','sigla':'SP','regiao':{'nome':'Sudeste'}}
    if 'intrarregiao=municipio' in url:return {'features':[{'properties':{'codarea':'3500001'},'geometry':polygon()},{'properties':{'codarea':'3500002'},'geometry':polygon(1)}]}
    return {'features':[{'properties':{'codarea':'35'},'geometry':polygon()}]}

class RecipesTest(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name);self.cache=GeographyCache(self.root/'data/ccr/geography')
        self.network=patch.object(GeographyCache,'_fetch',autospec=True,side_effect=synthetic).start();self.addCleanup(patch.stopall)

    def test_cold_warm_scope_hash_and_polygon_base(self):
        first=self.cache.ensure('state-SP');self.assertFalse(first['cacheHit']);self.assertEqual(len(first['data']['regions']),2)
        self.assertNotIn('<circle',Path(first['svg']).read_text('utf8'));self.assertEqual(self.network.call_count,4)
        self.network.side_effect=AssertionError('network forbidden')
        second=self.cache.ensure('state-SP');self.assertTrue(second['cacheHit']);self.assertEqual(first['generation'],second['generation'])
        self.assertFalse((self.cache.root/'world').exists())
        Path(second['svg']).write_text('<svg/>',encoding='utf8')
        with self.assertRaisesRegex(GeographyUnavailable,'Cache geográfico inválido'):self.cache.ensure('state-SP')

    def test_refresh_failure_preserves_previous_generation_and_warm_offline_use(self):
        first=self.cache.ensure('state-SP');pointer=(self.cache.root/'state-SP/current.json').read_bytes()
        self.network.side_effect=GeographyUnavailable('source offline')
        with self.assertRaises(GeographyUnavailable):self.cache.ensure('state-SP',refresh=True)
        self.assertEqual((self.cache.root/'state-SP/current.json').read_bytes(),pointer)
        self.assertEqual(self.cache.ensure('state-SP')['generation'],first['generation'])

    def test_concurrent_creation_downloads_once_and_has_one_cold_creator(self):
        def slow(*args):time.sleep(.01);return synthetic(*args)
        self.network.side_effect=slow
        with ThreadPoolExecutor(max_workers=4) as pool:results=list(pool.map(lambda _:self.cache.ensure('state-SP'),range(4)))
        self.assertEqual(self.network.call_count,4);self.assertEqual(sum(not r['cacheHit'] for r in results),1)
        self.assertEqual(len({r['generation'] for r in results}),1)

    def test_lookup_filters_without_geometry_or_whole_catalog_and_reuses_index(self):
        result=self.cache.lookup(['CIDADE ÁLFA','3500002'],state='SP')
        self.assertEqual([r['status'] for r in result],['ready','ready']);self.assertEqual(result[0]['matches'][0]['ibge_code'],'3500001')
        self.assertNotIn('geometry',result[0]['matches'][0]);result[0]['matches'][0]['name']='changed'
        self.assertEqual(self.cache.lookup(['Cidade Alfa'],state='SP')[0]['matches'][0]['name'],'Cidade Alfa')
        self.assertGreaterEqual(_lookup_index.cache_info().hits,1)

    def test_reject_unknown_provider_urls_traversal_point_geometry_and_invalid_rings(self):
        for key in ('../world','https://example.com','state-XX','neighborhoods-1234567'):
            with self.subTest(key=key),self.assertRaises((ValueError,GeographyUnavailable)):self.cache.ensure(key)
        self.network.assert_not_called()
        for geometry in ({'type':'Point','coordinates':[0,0]},{'type':'Polygon','coordinates':[[[0,0],[1,0],[1,1],[2,1]]]}, {'type':'Polygon','coordinates':[[[0,0],[999,0],[1,1],[0,0]]]}):
            with self.assertRaises(GeographyUnavailable):validate_geometry(geometry)

    def test_png_and_customer_overlay_never_mutate_public_cache(self):
        try:import fitz
        except ImportError:self.skipTest('optional PNG dependency')
        first=self.cache.png('state-SP');png=Path(first['png']);self.assertTrue(png.read_bytes().startswith(b'\x89PNG'))
        png.write_bytes(b'invalid');self.assertTrue(Path(self.cache.png('state-SP')['png']).read_bytes().startswith(b'\x89PNG'))
        source=self.root/'temp/values.json';source.parent.mkdir();source.write_text(json.dumps({'title':'Synthetic customer counts','values':[{'code':'3500001','value':7}]}))
        before=(Path(first['svg']).parent/'manifest.json').read_bytes()
        output=io.StringIO()
        with redirect_stdout(output):code=main(['render-map','--agent-root',str(self.root),'--key','state-SP','--data','temp/values.json','--output','outputs/test.png'])
        self.assertEqual(code,0,output.getvalue());self.assertTrue((self.root/'outputs/test.png').is_file())
        self.assertEqual((Path(first['svg']).parent/'manifest.json').read_bytes(),before)

    def test_module_discovery_exposes_shared_skill_and_exact_tools(self):
        descriptor=describe();self.assertEqual(descriptor['contractVersion'],3)
        self.assertEqual(set(descriptor['operations']),{'prepare-map','lookup-place','render-map','render-positions','export-document'})
        self.assertTrue(descriptor['skillGroups'][0]['skills'][0]['path'].is_file())
        recipe=json.loads((Path(__file__).resolve().parents[1]/'python/ccr/recipes/geography.json').read_text('utf8'))
        self.assertEqual(recipe['cache']['expiration'],'explicit-refresh-only')

    def test_drawing_upgrade_reuses_valid_vectors_offline_without_redownloading_sources(self):
        first=self.cache.ensure('state-SP');manifest=Path(first['svg']).with_name('manifest.json')
        old=json.loads(manifest.read_bytes());old.pop('drawingVersion');manifest.write_text(json.dumps(old),encoding='utf8')
        self.network.side_effect=AssertionError('network forbidden on drawing-only upgrade')
        upgraded=self.cache.ensure('state-SP')
        self.assertTrue(upgraded['cacheHit']);self.assertNotEqual(upgraded['generation'],first['generation'])
        self.assertEqual(upgraded['data']['obtainedAt'],first['data']['obtainedAt'])
        self.assertEqual(upgraded['manifest']['sources'],first['manifest']['sources'])

    def test_quantified_polygon_png_source_has_visible_names_values_and_attribution(self):
        import xml.etree.ElementTree as ET
        from ccr.drawing import render_svg
        data=self.cache.ensure('state-SP')['data']
        svg,_=render_svg('Synthetic',data['regions'],values={'3500001':7},attribution='Synthetic provider')
        texts=[e.text for e in ET.fromstring(svg).iter() if e.tag.endswith('}text')]
        self.assertIn('Cidade Alfa: 7',texts);self.assertIn('Synthetic provider',texts)

    def test_png_backend_keeps_dark_label_glyphs_over_the_quantified_polygon(self):
        try:import fitz
        except ImportError:self.skipTest('optional PNG dependency')
        from ccr.drawing import render_svg
        from ccr.geography import feature
        svg,_=render_svg('Synthetic',[feature('1','Cidade Alfa',polygon())],values={'1':7})
        with fitz.open(stream=svg.encode('utf8'),filetype='svg') as doc:pix=doc[0].get_pixmap(alpha=False)
        dark=sum(1 for y in range(410,440) for x in range(500,700) if (lambda rgb:rgb[0]<80 and rgb[1]<110 and rgb[2]<130)(pix.pixel(x,y)))
        self.assertGreater(dark,20,'The label must remain readable after real SVG-to-PNG rasterization')

if __name__=='__main__':unittest.main()
