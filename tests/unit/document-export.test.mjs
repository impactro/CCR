import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync,spawnSync} from 'node:child_process';
import {JSDOM} from 'jsdom';
import {decodeRichDocument,createDocumentRenderer,richDocumentText} from '../../src/document-renderer.mjs';
import {documentPages} from '../../src/document-scene.mjs';
import {createDataChart} from '../../src/chart.js';
const fixture=name=>JSON.parse(readFileSync(new URL(`../../examples/rich-documents/${name}.json`,import.meta.url),'utf8'));
const mixed=()=>fixture('mixed-series');
test('explicit mixed series retain all categories, zero/null gaps, units, axis and legend',()=>{
 const doc=mixed(),decoded=decodeRichDocument(doc);assert.equal(decoded.status,'ready');assert.deepEqual(decoded.document.data.chart,doc.data.chart);
 const dom=new JSDOM('');const figure=createDataChart(dom.window.document,{...doc.data,title:doc.title},{view:'column'});
 assert.equal(figure.querySelectorAll('tbody tr').length,4);assert.equal(figure.querySelectorAll('rect[data-value]').length,3);
 assert.equal(figure.querySelectorAll('circle[data-value]').length,3);assert.equal(figure.querySelectorAll('polyline').length,2);
 assert.match(figure.textContent,/Itens \(itens\)/);assert.match(figure.textContent,/Taxa \(%\)/);assert.match(figure.textContent,/Sem dado/);
 assert.ok(figure.querySelector('[data-value="0"]'));dom.window.close();
});
test('every chart property, numeric column, duplicate, type, axis, style and axis unit is strict',()=>{
 const cases=[s=>s.column=0,s=>s.column=3,s=>s.column=1.2,s=>s.type='area',s=>s.axis='auto',s=>s.color='url(https://bad)',s=>s.color='#fff',s=>s.unit='',s=>s.extra=1];
 for(const change of cases){const doc=mixed();change(doc.data.chart.series[0]);assert.equal(decodeRichDocument(doc).status,'invalid');}
 for(const change of [d=>d.data.chart.extra=1,d=>d.data.chart.series=[],d=>d.data.chart.series[1].column=1,d=>d.data.chart.series[1].axis='left',d=>d.data.columns[1].type='string',d=>d.view='bar',d=>d.data.rows=Array(49).fill(d.data.rows[0])]){const doc=mixed();change(doc);assert.equal(decodeRichDocument(doc).status,'invalid');}
});
test('multiple columns are grouped and multiple lines retain their own null gaps',()=>{
 const doc=mixed();doc.data.chart.series[1]={column:2,type:'column',axis:'left',unit:'itens'};
 const dom=new JSDOM('');let node=createDataChart(dom.window.document,doc.data,{view:'column'});
 assert.equal(node.querySelectorAll('rect[data-value]').length,6);
 const rectangles=[...node.querySelectorAll('rect[data-value]')];assert.notEqual(rectangles[0].getAttribute('x'),rectangles[3].getAttribute('x'));
 doc.data.chart.series.forEach(s=>s.type='line');node=createDataChart(dom.window.document,doc.data,{view:'line'});
 assert.equal(node.querySelectorAll('circle[data-value]').length,6);assert.equal(node.querySelectorAll('polyline').length,4);dom.window.close();
});
test('text/image/report schema rejects URLs, paths, nesting, oversized and extra fields',()=>{
 const report=fixture('six-panel-report');assert.equal(decodeRichDocument(report).status,'ready');
 for(const change of [d=>d.data.columns=4,d=>d.data.sections=[],d=>d.data.sections=Array(13).fill(mixed()),d=>d.data.sections[0]=fixture('six-panel-report'),d=>d.data.foo=1]){const doc=structuredClone(report);change(doc);assert.equal(decodeRichDocument(doc).status,'invalid');}
 for(const id of ['https://bad.test/a','../amostra','/file.png','a.b']){const doc=fixture('image-report').data.sections[1];doc.data.resourceId=id;assert.equal(decodeRichDocument(doc).status,'invalid');}
 const text=fixture('image-report').data.sections[0];text.data.text='x'.repeat(12001);assert.equal(decodeRichDocument(text).status,'invalid');
});
test('six panels use exactly the same SVG pages in DOM and closed runtime',()=>{
 const doc=fixture('six-panel-report'),pages=documentPages(doc);assert.equal(pages.length,1);
 const dom=new JSDOM('<main/>'),root=dom.window.document.querySelector('main');
 const handle=createDocumentRenderer().update(root,doc);assert.equal(handle.result.status,'ready');assert.equal(root.querySelectorAll('svg').length,1);assert.equal(root.querySelectorAll('table').length,6);
 const template=dom.window.document.createElement('template');template.innerHTML=pages[0];assert.equal(root.querySelector('svg').outerHTML,template.content.firstElementChild.outerHTML);
 const output=execFileSync(process.execPath,['python/ccr/runtime/export.mjs'],{input:JSON.stringify({document:doc}),encoding:'utf8'});assert.deepEqual(JSON.parse(output).pages,pages);
 assert.match(richDocumentText(doc,{document:dom.window.document}),/Painel 6/);handle.dispose();assert.equal(handle.signal.aborted,true);dom.window.close();
});
test('image resources are only host-resolved bytes; missing/untrusted resources fail and dispose clears them',()=>{
 const doc=fixture('image-report');assert.throws(()=>documentPages(doc),/missing_image_resource/);
 assert.throws(()=>documentPages(doc,{resolveResource:()=>({url:'https://bad.test'})}),/invalid_image_resource/);
 const resource={mime:'image/png',base64:'iVBORw0KGgo=',width:1,height:1};
 const dom=new JSDOM('<main/>'),root=dom.window.document.querySelector('main');let id;
 const renderer=createDocumentRenderer({resolveResource:key=>{id=key;return resource;}});renderer.update(root,doc);assert.equal(id,'amostra');const image=root.querySelector('image');assert.match(image.getAttribute('href'),/^data:image\/png;base64,/);renderer.dispose(root);assert.equal(image.getAttribute('href'),null);dom.window.close();
});
test('tables paginate with all rows and reports reject oversize panels, never truncate',()=>{
 const doc=mixed();delete doc.data.chart;doc.view='table';doc.data.rows=Array.from({length:200},(_,i)=>['Row '+i,i,null]);
 const pages=documentPages(doc);assert.ok(pages.length>1);assert.equal((pages.join('').match(/Row \d+/g)||[]).length,200);assert.match(pages.at(-1),/Row 199/);
 const report=fixture('six-panel-report');report.data.sections=[doc];assert.throws(()=>documentPages(report),/panel_layout_limit/);
 doc.view='column';assert.throws(()=>documentPages(doc),/chart_layout_limit/);
});
test('old chart and document formats retain table fallback and null filtering',()=>{
 const doc=mixed();delete doc.data.chart;const dom=new JSDOM('');
 for(const view of ['bar','column','line','area']){const figure=createDataChart(dom.window.document,doc.data,{view});assert.ok(figure.querySelector('svg'));assert.equal(figure.querySelectorAll('tbody tr').length,4);}
 doc.data.rows=Array.from({length:101},(_,i)=>['P'+i,i,null]);assert.equal(createDataChart(dom.window.document,doc.data).querySelector('svg'),null);dom.window.close();
});
test('bundled runtime provenance matches sources deterministically and invalid input fails closed',()=>{
 execFileSync(process.execPath,['tools/build-export-runtime.mjs','--check']);
 // Builder check is read-only; independent source/hash assertions detect a stale bundle.
 const result=spawnSync(process.execPath,['python/ccr/runtime/export.mjs'],{input:JSON.stringify({document:{owner:'CES',format:'ccr.document'}}),encoding:'utf8'});assert.notEqual(result.status,0);
});
test('rich typed table preserves the fixed 10000-row ceiling, including tree traversal',()=>{
 const doc=mixed();delete doc.data.chart;doc.view='table';doc.data.rows=Array.from({length:10000},(_,i)=>['P'+i,0,null]);
 assert.equal(decodeRichDocument(doc).status,'ready');doc.data.rows.push(['overflow',0,null]);assert.equal(decodeRichDocument(doc).status,'invalid');
});
