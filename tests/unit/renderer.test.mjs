import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createChatRenderer,createHtmlFrame,resourceUrl,createDataChart} from '../../src/index.js';
const fixture=()=>{const dom=new JSDOM('<main></main>',{url:'https://host.test'});return {dom,element:dom.window.document.querySelector('main')};};

test('markdown remains inert; unsafe links and raw HTML are removed',()=>{
 const {dom,element}=fixture();
 createChatRenderer().render(element,{text:'**Olá** [bom](https://example.org) [ruim](javascript:alert(1)) <script>alert(1)</script>'});
 assert.equal(element.querySelector('strong').textContent,'Olá');
 assert.equal(element.querySelectorAll('a').length,1);assert.equal(element.querySelector('a').rel,'noopener noreferrer');
 assert.equal(element.querySelector('script'),null);dom.window.close();
});
test('one failed plugin cannot erase another block or explanation',()=>{
 const {dom,element}=fixture(),issues=[];
 const render=createChatRenderer({plugins:{broken(){throw Error('secret');}}});
 render.render(element,{text:'Explicação.\n\n```broken\nfoo\n```\n\n```data\n{"columns":["A","B"],"rows":[["SP",1]]}\n```'},{onIssue:e=>issues.push(e)});
 assert.match(element.textContent,/Explicação/);assert.ok(element.querySelector('table'));assert.equal(issues.length,1);assert.doesNotMatch(element.textContent,/secret/);dom.window.close();
});
test('HTML and SPA remain isolated; scripts require a host decision',()=>{
 const {dom,element}=fixture();
 createChatRenderer().render(element,{text:'```html\n<button>Testar</button><script>parent.pwned=1</script>\n```'});
 const frame=element.querySelector('iframe');assert.equal(frame.getAttribute('sandbox'),'');assert.match(frame.srcdoc,/script-src 'none'/);
 assert.throws(()=>createHtmlFrame(dom.window.document,'<button>Rodar</button>',{scripts:true}));
 const interactive=createHtmlFrame(dom.window.document,'<button>Rodar</button>',{scripts:true,runtimeUrl:'/rich-app.html'});
 assert.equal(interactive.getAttribute('sandbox'),'allow-scripts');assert.equal(interactive.src,'https://host.test/rich-app.html');assert.doesNotMatch(interactive.getAttribute('sandbox'),/same-origin|top-navigation|forms/);dom.window.close();
});
test('media has no eager playback and resources stay under host authorization',()=>{
 const {dom,element}=fixture();
 const render=createChatRenderer({allowResource:url=>url.origin==='https://host.test'&&url.pathname.startsWith('/files/')});
 render.render(element,{text:'',attachments:[{type:'voice',url:'/files/a.mp3',transcript:'Voz de exemplo'},{type:'video',url:'/files/b.mp4'},{type:'pdf',url:'/files/c.pdf'},{type:'image',url:'/files/d.png'}]});
 assert.equal(element.querySelector('audio').preload,'none');assert.equal(element.querySelector('video').preload,'none');assert.equal(element.querySelectorAll('iframe').length,0);
 assert.match(element.textContent,/Voz de exemplo/);assert.equal(element.querySelector('img').loading,'lazy');
 render.dispose(element);assert.equal(element.querySelector('audio').getAttribute('src'),null);
 assert.throws(()=>resourceUrl('https://private.test/file',{baseUrl:'https://host.test'}));
 assert.throws(()=>resourceUrl('javascript:alert(1)',{baseUrl:'https://host.test',allowResource:()=>true}));dom.window.close();
});
test('YouTube makes no embed request until requested by the visitor',()=>{
 const {dom,element}=fixture();createChatRenderer().render(element,{text:'```youtube\n{"id":"xNM4BMXrSaI","title":"Exemplo"}\n```'});
 assert.equal(element.querySelector('iframe'),null);element.querySelector('button').click();
 assert.match(element.querySelector('iframe').src,/youtube-nocookie.com/);dom.window.close();
});
test('rerender and explicit dispose release plugins exactly once',()=>{
 const {dom,element}=fixture();let cleaned=0;
 const renderer=createChatRenderer({plugins:{owned(source,ctx){ctx.cleanup(()=>cleaned++);return ctx.document.createElement('section');}}});
 const first=renderer.render(element,{text:'```owned\na\n```'});
 renderer.render(element,{text:'Texto novo'});assert.equal(cleaned,1);assert.equal(first.signal.aborted,true);
 renderer.dispose(element);renderer.dispose(element);assert.equal(cleaned,1);dom.window.close();
});
test('a stale handle cannot dispose the replacement response',()=>{
 const {dom,element}=fixture();let disposed=0;
 const renderer=createChatRenderer({plugins:{owned(source,ctx){ctx.cleanup(()=>disposed++);return ctx.document.createElement('div');}}});
 const old=renderer.render(element,{text:'Antes'});
 const current=renderer.render(element,{text:'```owned\nnow\n```'});
 old.dispose();assert.equal(current.signal.aborted,false);assert.equal(disposed,0);
 current.dispose();assert.equal(disposed,1);dom.window.close();
});
test('local charts preserve negative/zero values and all 100 rows fit',()=>{
 const {dom}=fixture(),doc=dom.window.document;
 const value={columns:['Nome','Valor'],rows:Array.from({length:100},(_,i)=>['Item '+i,i-50])};
 const chart=createDataChart(doc,value,{view:'bar'});
 assert.equal(chart.querySelectorAll('rect').length,100);assert.equal(chart.querySelectorAll('tbody tr').length,100);
 const height=Number(chart.querySelector('svg').getAttribute('viewBox').split(' ')[3]);
 assert.ok(height>Number([...chart.querySelectorAll('rect')].at(-1).getAttribute('y'))+20);
 for(const view of ['line','column','area'])assert.ok(createDataChart(doc,{columns:['A','B'],rows:[['zero',0]]},{view}).querySelector('svg'));
 dom.window.close();
});
test('visual budgets include all plugins and media; invalid values never execute',()=>{
 const {dom,element}=fixture();let count=0;
 const renderer=createChatRenderer({limits:{visuals:1},plugins:{item(source,ctx){count++;return ctx.document.createElement('div');}}});
 renderer.render(element,{text:'```item\na\n```\n\n```item\nb\n```',attachments:[{type:'youtube',id:'xNM4BMXrSaI'}]});
 assert.equal(count,1);assert.equal(element.querySelectorAll('button').length,0);
 renderer.render(element,{text:'```data\n{"columns":["A"],"rows":[[{}]]}\n```'});assert.ok(element.querySelector('.chat-render-error'));dom.window.close();
});
