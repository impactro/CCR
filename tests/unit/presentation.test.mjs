import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {sequenceFor,messageTime,createConversationState,createChatRenderer,resourceUrl} from '../../src/index.js';
const first={conversationId:'one',messageId:'a',authorId:'author',direction:'incoming',role:'user',createdAt:Date.parse('2026-10-29T02:59:00Z')};
test('groups by local day, conversation and known author, separating events and directions',()=>{
 assert.equal(messageTime(first.createdAt),'23:59');
 const later={...first,messageId:'b',createdAt:first.createdAt+120000};
 assert.deepEqual(sequenceFor(later,first),{date:'29/10/2026',continuation:false});
 assert.equal(sequenceFor({...first,messageId:'b'},first).continuation,true);
 for(const changed of [{conversationId:'two'},{authorId:null},{direction:'outgoing'},{role:'system'},{breakBefore:true}])assert.equal(sequenceFor({...first,...changed},first).continuation,false);
});
test('draft, scroll and selected state stay per conversation',()=>{
 const state=createConversationState();state.select('one').draft='Draft one';state.get('one').scrollTop=123;state.select('two').draft='Draft two';
 assert.equal(state.select('one').draft,'Draft one');assert.equal(state.get('two').draft,'Draft two');assert.equal(state.get('one').scrollTop,123);state.clear();assert.equal(state.activeConversationId,null);assert.equal(state.get('one').draft,'');
});
test('unchanged polling preserves live media; another conversation releases it',()=>{
 const dom=new JSDOM('<main/>',{url:'https://host.test'}),root=dom.window.document.querySelector('main');
 const renderer=createChatRenderer({allowResource:()=>true}),message={attachments:[{type:'audio',url:'/a.ogg'}]},context={conversationId:'one',messageId:'a'};
 const handle=renderer.update(root,message,context),audio=root.querySelector('audio');audio.currentTime=12;
 assert.equal(renderer.update(root,structuredClone(message),context),handle);assert.equal(root.querySelector('audio'),audio);assert.equal(audio.currentTime,12);
 renderer.update(root,message,{...context,conversationId:'two'});assert.equal(handle.signal.aborted,true);assert.notEqual(root.querySelector('audio'),audio);renderer.dispose(root);dom.window.close();
});
test('Blob requires same-origin and explicit host grant; executable URLs stay denied',()=>{
 const options={baseUrl:'https://host.test',allowResource:()=>true};assert.equal(resourceUrl('blob:https://host.test/owned',options),'blob:https://host.test/owned');
 assert.throws(()=>resourceUrl('blob:https://other.test/a',options));assert.throws(()=>resourceUrl('blob:https://host.test/a',{baseUrl:'https://host.test'}));assert.throws(()=>resourceUrl('data:text/html,bad',options));
});
