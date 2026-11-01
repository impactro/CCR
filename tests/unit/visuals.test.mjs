import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createHeatmap,createGeoMap} from '../../src/visuals.mjs';
import {createChatRenderer} from '../../src/renderer.js';
import {decodeRichDocument,createDocumentRenderer} from '../../src/document-renderer.mjs';

const grid={title:'Calor',columns:[{label:'Nome',type:'string'},{label:'Valor',type:'number'}],rows:[['Zero',0],['Ausente',null],['Máximo',10]]};
test('heatmap keeps zero, null and accessible text with deterministic relative colors',()=>{
 const dom=new JSDOM();const node=createHeatmap(dom.window.document,grid);const cells=node.querySelectorAll('tbody tr td:nth-child(2)');
 assert.equal(cells[0].dataset.heatValue,'0');assert.equal(cells[1].dataset.heatValue,undefined);
 assert.notEqual(cells[0].style.backgroundColor,cells[2].style.backgroundColor);assert.equal(node.querySelectorAll('tbody tr').length,3);dom.window.close();
});
test('coordinate map rejects invalid coordinates, uses text labels and only explicit HTTPS map links',()=>{
 const dom=new JSDOM();const node=createGeoMap(dom.window.document,{title:'Mapa',columns:['Name','Latitude','Longitude'],rows:[['<script>bad</script>',-23.5,-46.6],['Invalid',100,200],['Missing',null,null]]});
 assert.equal(node.querySelectorAll('circle').length,1);assert.equal(node.querySelector('script'),null);
 assert.match(node.querySelector('svg a').getAttribute('href'),/^https:\/\/www\.google\.com\/maps\?q=-23.5,-46.6$/);assert.equal(node.querySelectorAll('tbody tr').length,3);dom.window.close();
});
test('CCR protocol and Markdown share map and heatmap primitives without host services',()=>{
 const dom=new JSDOM('<main></main>',{url:'https://host.test/'}),root=dom.window.document.querySelector('main');
 for(const view of ['map','heatmap']){
  const document={owner:'CES',format:'ccr.document',version:1,renderer:{name:'CCR',version:1},type:'data',view,title:'Teste',data:{columns:grid.columns,rows:grid.rows}};
  assert.equal(decodeRichDocument(document).status,'ready');const renderer=createDocumentRenderer();const handle=renderer.update(root,document);assert.equal(handle.result.status,'ready');handle.dispose();assert.equal(handle.signal.aborted,true);
  const rich=createChatRenderer();rich.render(root,{text:'```ccr\n'+JSON.stringify(document)+'\n```'});assert.equal(root.querySelectorAll('.chat-rich-document').length,1);rich.dispose(root);
 }
 const renderer=createChatRenderer();renderer.render(root,{text:'```heatmap\n'+JSON.stringify(grid)+'\n```'});assert.equal(root.querySelectorAll('.chat-heatmap').length,1);renderer.dispose(root);dom.window.close();
});
