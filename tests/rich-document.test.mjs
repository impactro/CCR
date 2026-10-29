import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {decodeRichDocument,createDocumentRenderer,RICH_DOCUMENT_MAX_BYTES} from '../src/document-renderer.mjs';
import {createChatRenderer} from '../src/renderer.js';
const example=()=>({owner:'CES',format:'ccr.document',version:1,renderer:{name:'CCR',version:1},type:'data',view:'table',title:'Typed data',data:{columns:[{label:'Name',type:'string'},{label:'Total',type:'number'},{label:'Active',type:'boolean'},{label:'Day',type:'date'},{label:'When',type:'datetime'},{label:'Rich',type:'html'}],rows:[['One',0,false,'2026-10-29','2026-10-29T13:00:00Z','<strong>Safe</strong>'],['Two',null,true,null,null,null]],source:'Synthetic fixture'}});
const fixture=()=>{const dom=new JSDOM('<main></main>',{url:'https://host.test/'});return {dom,element:dom.window.document.querySelector('main')};};

test('object and JSON attachment produce identical typed content without losing null/false/zero',()=>{
 const value=example(),one=decodeRichDocument(value),two=decodeRichDocument('\uFEFF'+JSON.stringify(value));assert.deepEqual(one,two);assert.equal(one.status,'ready');
 assert.deepEqual(one.document.data.rows,value.data.rows);value.data.rows[0][0]='changed';assert.equal(one.document.data.rows[0][0],'One');
 const {dom,element}=fixture();createDocumentRenderer().update(element,one.document);
 const cells=[...element.querySelectorAll('tbody tr:first-child td')];assert.deepEqual(cells.map(c=>c.textContent),['One','0','Não','2026-10-29','2026-10-29T13:00:00Z','Safe']);
 assert.ok(cells[5].querySelector('strong'));assert.equal(element.querySelectorAll('tbody tr:last-child td')[1].textContent,'Sem dado');dom.window.close();
});
test('ordinary JSON/HTML stay files; incompatible versions, malformed data and executable fields never render',()=>{
 for(const input of ['<html>ordinary</html>','plain text','{"title":"ordinary"}',{owner:'CES',format:'other'}])assert.equal(decodeRichDocument(input).status,'unrecognized');
 for(const change of [{version:2},{renderer:{name:'CCR',version:2}},{type:'script'},{view:'pie'}])assert.equal(decodeRichDocument({...example(),...change}).status,'unsupported');
 for(const change of [{token:'secret'},{authorId:'other'},{data:{columns:[],rows:[]}},{renderer:{name:'CCR',version:1,scripts:true}}])assert.equal(decodeRichDocument({...example(),...change}).status,'invalid');
 assert.equal(decodeRichDocument('{"owner":"CES"').status,'invalid');
 const value=example();value.data.rows[0][1]='0';assert.equal(decodeRichDocument(value).status,'invalid');
 const bad=example();bad.data.rows[0][3]='2026-02-30';assert.equal(decodeRichDocument(bad).status,'invalid');
 const naive=example();naive.data.rows[0][4]='2026-10-29T13:00:00';assert.equal(decodeRichDocument(naive).status,'invalid');
});
test('size, depth, shape and prototype tricks fail closed without invoking accessors',()=>{
 assert.equal(decodeRichDocument(' '.repeat(RICH_DOCUMENT_MAX_BYTES+1)).code,'document_limit');
 const deep=example();let node=deep;for(let i=0;i<20;i++){node.extra={};node=node.extra;}assert.equal(decodeRichDocument(deep).code,'document_limit');
 const cycle=example();cycle.data.cycle=cycle;assert.equal(decodeRichDocument(cycle).status,'invalid');
 const proto=JSON.stringify(example()).replace('"owner":"CES"','"__proto__":{},"owner":"CES"');assert.equal(decodeRichDocument(proto).status,'invalid');assert.equal({}.polluted,undefined);
 let invoked=false;const accessor={get owner(){invoked=true;return 'CES';}};assert.equal(decodeRichDocument(accessor).status,'invalid');assert.equal(invoked,false);
 const wide=example();wide.data.rows=Array.from({length:1001},()=>wide.data.rows[0].slice());assert.equal(decodeRichDocument(wide).status,'invalid');
});
test('all four views share original typed table; unsupported chart stays a file',()=>{
 const {dom,element}=fixture(),renderer=createDocumentRenderer();
 for(const view of ['bar','column','line','area']){
  const result=renderer.update(element,{...example(),view});assert.equal(result.result.status,'ready');assert.ok(element.querySelector('svg'));assert.equal(element.querySelectorAll('tbody tr').length,2);
  assert.deepEqual([...element.querySelectorAll('tbody tr:first-child td')].slice(0,3).map(c=>c.textContent),['One','0','Não']);
 }
 const value=example();value.data.rows=Array.from({length:101},(_,i)=>[String(i),i,false,'2026-10-29','2026-10-29T13:00:00Z','x']);renderer.update(element,{...value,view:'bar'});assert.equal(element.querySelector('svg'),null);assert.equal(element.querySelectorAll('tbody tr').length,101);dom.window.close();
});
test('HTML marker and JSON HTML render identically, passive and isolated; stale handles cannot discard replacements',()=>{
 const header={owner:'CES',format:'ccr.document',version:1,renderer:{name:'CCR',version:1},type:'html',title:'Example'};
 const html='<h1>Example</h1><form><input><button>Test</button></form><script>parent.pwned=1</script><iframe src="https://bad.test"></iframe>';
 const source='<!-- CES-CCR '+JSON.stringify(header)+' -->'+html,json={...header,data:{html}};
 assert.deepEqual(decodeRichDocument(source),decodeRichDocument(json));
 const {dom,element}=fixture(),renderer=createDocumentRenderer(),one=renderer.update(element,source),frame=element.querySelector('iframe');
 assert.equal(frame.getAttribute('sandbox'),'');assert.match(frame.srcdoc,/script-src 'none'/);assert.doesNotMatch(frame.srcdoc,/parent.pwned|bad\.test|<form|<iframe/);
 assert.equal(renderer.update(element,json),one);assert.equal(element.querySelector('iframe'),frame);
 const next=renderer.update(element,example());assert.equal(one.signal.aborted,true);assert.equal(frame.getAttribute('srcdoc'),null);one.dispose();assert.equal(next.signal.aborted,false);
 renderer.dispose(element);assert.equal(next.signal.aborted,true);dom.window.close();
});
test('inline HTML cells keep formatting but cannot load resources, run scripts, change styles or navigate',()=>{
 const value=example();value.data.rows[0][5]='<strong onclick="evil()" style="position:fixed">Safe</strong><script>bad()</script><img src="https://bad.test"><a href="javascript:evil()">Link</a><svg onload="evil()"/><iframe src="https://bad.test"></iframe>';
 const {dom,element}=fixture();createDocumentRenderer().update(element,value);const cell=element.querySelector('[data-type=html]');assert.ok(cell.querySelector('strong'));
 assert.equal(cell.querySelector('[onclick],[style],script,img,a,svg,iframe'),null);assert.match(cell.textContent,/SafeLink/);assert.doesNotMatch(cell.textContent,/bad\(\)/);dom.window.close();
});

test('rich body accepts the same document object, counts its visual budget and disposes native frames',()=>{
 const {dom,element}=fixture(),renderer=createChatRenderer({limits:{visuals:2}}),context={conversationId:'one',messageId:'doc'};
 const html={owner:'CES',format:'ccr.document',version:1,renderer:{name:'CCR',version:1},type:'html',title:'Isolated',data:{html:'<p>Passive</p>'}};
 const message={text:'Explanation',documents:[example(),html]},handle=renderer.update(element,message,context),frame=element.querySelector('iframe');
 assert.match(element.textContent,/Explanation/);assert.ok(element.querySelector('table'));assert.ok(frame);assert.equal(frame.getAttribute('sandbox'),'');
 assert.equal(renderer.update(element,structuredClone(message),context),handle);assert.equal(element.querySelector('iframe'),frame);
 renderer.dispose(element);assert.equal(frame.getAttribute('srcdoc'),null);
 const limited=createChatRenderer({limits:{visuals:1}});limited.render(element,{text:'',attachments:[{type:'youtube',id:'xNM4BMXrSaI'}],documents:[example()]});assert.equal(element.querySelector('table'),null);dom.window.close();
});
