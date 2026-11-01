import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {renderMessageActions,createMessageActionRail} from '../src/actions.mjs';
const scope={conversationId:'conversation',messageId:'message'};
const action=(kind,extra={})=>({actionId:kind,kind,label:kind,invoke:()=>{},...extra});
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
function setup(){const dom=new JSDOM('<main><audio></audio><iframe></iframe><textarea>draft</textarea><aside></aside></main>');return {dom,document:dom.window.document,root:dom.window.document.querySelector('aside')};}

test('delete is absent without a host descriptor and carries no implicit transport behavior',()=>{
 assert.equal(renderMessageActions([action('copy')]).includes('data-chat-action-id="delete"'),false);
 let calls=0;const html=renderMessageActions([action('delete',{label:'Apagar para todos',invoke:()=>calls++})]);
 assert.equal(calls,0);assert.match(html,/aria-label="Apagar para todos"/);assert.match(html,/M3 6h18/);
});

test('pure rail orders capabilities, escapes labels and excludes ungranted links',()=>{
 const html=renderMessageActions([action('forward'),action('download',{resolveLink:()=>({href:'blob:authorized',download:'a.pdf'})}),action('reply'),action('react'),action('copy',{label:'<unsafe>'}),action('preview',{visible:false}),action('open',{resolveLink:()=>({href:'javascript:evil()'})})]);
 const dom=new JSDOM(html),nodes=[...dom.window.document.querySelectorAll('button,a')];
 assert.deepEqual(nodes.map(node=>node.dataset.chatActionId),['reply','react','copy','download','forward']);
 assert.equal(nodes[2].title,'<unsafe>');assert.equal(nodes[3].download,'a.pdf');assert.equal(dom.window.document.querySelector('unsafe'),null);dom.window.close();
});

test('keyed updates preserve controls, player, PDF and draft; capabilities remove controls',()=>{
 const {dom,document,root}=setup(),audio=document.querySelector('audio'),pdf=document.querySelector('iframe'),draft=document.querySelector('textarea');
 const rail=createMessageActionRail(root,{scope,actions:[action('copy'),action('reply')]});
 const copy=root.querySelector('[data-chat-action-id=copy]');copy.focus();
 rail.update({scope,actions:[action('copy'),action('reply',{enabled:false})]});
 assert.equal(root.querySelector('[data-chat-action-id=copy]'),copy);assert.equal(document.activeElement,copy);
 assert.equal(root.firstElementChild.disabled,true);assert.equal(document.querySelector('audio'),audio);assert.equal(document.querySelector('iframe'),pdf);assert.equal(draft.value,'draft');
 rail.update({scope,actions:[action('copy')]});assert.equal(root.children.length,1);rail.dispose();dom.window.close();
});

test('pending prevents reentry and scope replacement aborts and ignores late completion',async()=>{
 const {dom,root}=setup();let resolve,calls=0,signal;const feedback=[];
 const rail=createMessageActionRail(root,{scope,onFeedback:value=>feedback.push(value),actions:[action('copy',{invoke:context=>{calls++;signal=context.signal;return new Promise(done=>resolve=done);}})]});
 root.firstElementChild.click();root.firstElementChild.click();assert.equal(calls,1);assert.equal(root.firstElementChild.disabled,true);
 rail.update({scope:{...scope,messageId:'other'},actions:[action('copy')]});assert.equal(signal.aborted,true);resolve({feedback:'done'});await tick();assert.deepEqual(feedback,[]);rail.dispose();dom.window.close();
});

test('same-message removal disposes once, aborts operations and hides unavailable resources',async()=>{
 const {dom,root}=setup();let resolve,signal,disposed=0;
 const rail=createMessageActionRail(root,{scope,actions:[action('copy',{dispose:()=>disposed++,invoke:context=>{signal=context.signal;return new Promise(done=>resolve=done);}}),action('download',{resolveLink:()=>({href:'blob:one',download:'file'})})]});
 root.firstElementChild.click();rail.update({scope,actions:[action('download',{resolveLink:()=>null})]});assert.equal(root.children.length,0);assert.equal(disposed,1);assert.equal(signal.aborted,true);resolve();await tick();rail.dispose();assert.equal(disposed,1);dom.window.close();
});

test('original export node and handlers are adopted without cloning or resurrecting hidden PNG',()=>{
 const {dom,document,root}=setup(),pdf=document.createElement('button'),png=document.createElement('button');let clicks=0;pdf.onclick=()=>clicks++;png.hidden=true;
 const actions=[action('export',{actionId:'pdf',element:pdf,invoke:undefined}),action('export',{actionId:'png',element:png,invoke:undefined})];
 const rail=createMessageActionRail(root,{scope,actions});rail.update({scope,actions});assert.equal(root.firstElementChild,pdf);assert.equal(root.lastElementChild,png);pdf.click();assert.equal(clicks,1);assert.equal(png.hidden,true);rail.dispose();dom.window.close();
});

test('host errors are sanitized, callbacks cannot leave a pending control, parent abort disposes',async()=>{
 const {dom,root}=setup(),parent=new AbortController();let error;
 const rail=createMessageActionRail(root,{scope,signal:parent.signal,onError:value=>{error=value;throw Error('host callback');},actions:[action('copy',{invoke:()=>{throw Error('private backend detail');}})]});
 root.firstElementChild.click();await tick();assert.deepEqual(error,{actionId:'copy',code:'action_failed'});assert.equal(root.firstElementChild.disabled,false);parent.abort();assert.equal(root.children.length,0);assert.throws(()=>rail.update({scope,actions:[]}),/disposed/);dom.window.close();
});

test('granted links retain native gestures and button-to-link transitions replace only that control',()=>{
 const {dom,root}=setup();const rail=createMessageActionRail(root,{scope,actions:[action('download')]});const original=root.firstElementChild;
 rail.update({scope,actions:[action('download',{invoke:undefined,resolveLink:()=>({href:'https://example.test/file',download:'file.pdf'})})]});
 assert.notEqual(root.firstElementChild,original);assert.equal(root.firstElementChild.tagName,'A');assert.equal(root.firstElementChild.download,'file.pdf');rail.dispose();dom.window.close();
});
