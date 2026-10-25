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
test('PDF loads only on demand and disposal cancels its page and document',async()=>{
 const dom=new JSDOM('<main/>',{url:'https://host.test'}),w=dom.window,root=w.document.querySelector('main');let loaded=0,fetched=0,destroyed=0,cancelled=0;
 w.HTMLCanvasElement.prototype.getContext=()=>({});
 w.fetch=async()=>{fetched++;return new Response(new Uint8Array([37,80,68,70]),{headers:{'content-type':'application/pdf'}});};
 const library={GlobalWorkerOptions:{},getDocument(){return {promise:Promise.resolve({numPages:1,async getPage(){return {getViewport:()=>({width:595,height:842}),render(){return {promise:Promise.resolve(),cancel(){cancelled++;}};}};}}),async destroy(){destroyed++;}};}};
 const renderer=createChatRenderer({allowResource:()=>true,pdfLoader:async()=>{loaded++;return library;},pdfWorkerUrl:'/pdf-worker.mjs'});
 const handle=renderer.render(root,{attachments:[{type:'pdf',url:'/document.pdf'}]});assert.equal(loaded,0);assert.equal(fetched,0);
 root.querySelector('button').click();for(let i=0;i<12;i++)await new Promise(resolve=>setImmediate(resolve));
 assert.equal(loaded,1);assert.equal(fetched,1);assert.match(root.textContent,/Página 1 de 1/);assert.equal(root.querySelector('canvas').hidden,false);
 assert.equal(library.GlobalWorkerOptions.workerSrc,'https://host.test/pdf-worker.mjs');handle.dispose();assert.equal(destroyed,1);assert.equal(cancelled,1);assert.equal(root.querySelector('canvas').width,0);w.close();
});
test('a disposed PDF cannot start a download when its lazy loader finishes later',async()=>{
 const dom=new JSDOM('<main/>',{url:'https://host.test'}),w=dom.window,root=w.document.querySelector('main');let finish,fetches=0;
 w.fetch=()=>{fetches++;throw Error('must not fetch');};
 const renderer=createChatRenderer({allowResource:()=>true,pdfLoader:()=>new Promise(resolve=>finish=resolve),pdfWorkerUrl:'/pdf-worker.mjs'});
 const handle=renderer.render(root,{attachments:[{type:'pdf',url:'/document.pdf'}]});root.querySelector('button').click();handle.dispose();finish({});await new Promise(resolve=>setImmediate(resolve));assert.equal(fetches,0);w.close();
});
