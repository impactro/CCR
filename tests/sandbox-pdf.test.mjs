import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {createChatRenderer,createHtmlFrame} from '../src/index.js';
const bootstrap=await readFile(new URL('../src/sandbox-runtime.js',import.meta.url),'utf8');
test('sandbox accepts one parent payload, removes navigation and preserves form controls',()=>{
 const dom=new JSDOM('<main id="content"></main>',{url:'https://host.test/rich-content.html',runScripts:'outside-only'}),w=dom.window;
 w.eval(bootstrap);
 const html='<meta http-equiv="refresh" content="0;url=https://untrusted.test"><form><button id="inside" onclick="window.bad=1">Local</button></form><iframe src="https://untrusted.test"></iframe><script>window.bad=2</script>';
 const send=(source,payload)=>w.dispatchEvent(new w.MessageEvent('message',{source,data:{type:'crania:render-html',html,scripts:false,...payload}}));
 send({},{});assert.equal(w.document.querySelector('#inside'),null);
 send(w.parent,{});assert.ok(w.document.querySelector('#inside'));assert.equal(w.document.querySelector('#inside').getAttribute('onclick'),null);
 assert.equal(w.document.querySelector('form,iframe,script,meta'),null);assert.equal(w.bad,undefined);
 send(w.parent,{scripts:true});assert.equal(w.bad,undefined);w.close();
});
test('passive HTML cannot introduce refresh, links, forms or a nested browsing context',()=>{
 const dom=new JSDOM('<main/>',{url:'https://host.test'});
 const frame=createHtmlFrame(dom.window.document,'<meta http-equiv="refresh" content="0;url=https://x.test"><a href="https://x.test">Link</a><form><input></form><iframe></iframe>');
 assert.doesNotMatch(frame.srcdoc,/http-equiv="refresh"|<form|<iframe|href=/);assert.match(frame.srcdoc,/<input/);dom.window.close();
});
test('PDF is native, lazy, contained and disposed without a JavaScript PDF engine',()=>{
 const dom=new JSDOM('<section id="conversation"><main/></section>',{url:'https://host.test'}),w=dom.window,root=w.document.querySelector('main'),container=w.document.querySelector('section');
 const renderer=createChatRenderer({allowResource:()=>true});
 const handle=renderer.render(root,{attachments:[{type:'pdf',url:'/document.pdf'}]},{viewerContainer:container});
 assert.equal(root.querySelector('object'),null);root.querySelector('button').click();
 const pdf=container.querySelector('object');assert.equal(pdf.type,'application/pdf');assert.equal(pdf.data,'https://host.test/document.pdf#toolbar=0&navpanes=0');
 assert.equal(container.querySelector('canvas,iframe'),null);assert.equal(container.querySelector('.chat-file-toolbar a').getAttribute('download'),'');
 const close=container.querySelector('.chat-file-toolbar button');close.click();assert.equal(pdf.getAttribute('data'),null);assert.equal(container.querySelector('.chat-file-viewer'),null);
 root.querySelector('button').click();assert.ok(container.querySelector('object'));handle.dispose();assert.equal(container.querySelector('.chat-file-viewer'),null);w.close();
});
