import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createProgressiveHistory} from '../../src/progressive-history.mjs';
import {deferred,flush} from '../helpers/async.mjs';

const scope=(key='user-one/account-one/chat',conversationId='chat')=>({key,conversationId});
const row=(messageId,value=messageId)=>({messageId,value,createdAt:1});
const page=(messages,olderCursor=null)=>({messages,page:{hasMore:olderCursor!==null,olderCursor}});
function fixture(loadPage,options={}){
 const dom=new JSDOM('<textarea>draft</textarea><main></main>',{url:'https://fixture.invalid/'});
 const document=dom.window.document,mount=document.querySelector('main'),rendered=[],released=[],signals=[],states=[];
 const view=createProgressiveHistory(mount,{source:{loadPage},pageSize:2,messageKey:m=>m.messageId,
  renderMessage(message,{signal}){
   rendered.push(message.messageId);signals.push(signal);
   const element=document.createElement('article');element.dataset.id=message.messageId;element.textContent=JSON.stringify(message.value);
   Object.defineProperty(element,'offsetTop',{get(){return [...mount.querySelectorAll('article')].indexOf(element)*30;}});
   return {element,dispose(){released.push(message.messageId);},update(next){element.textContent=JSON.stringify(next.value);},
    updateMetadata({previousMessage}){element.dataset.previous=previousMessage?.messageId||'';}};
  },onState:state=>states.push(state),...options});
 return {dom,document,mount,view,rendered,released,signals,states,close(){view.dispose();dom.window.close();}};
}

test('native reconciliation inserts late events in order, updates metadata once and preserves live nodes',async()=>{
 const first=row('2'),last=row('4');const f=fixture(async()=>page([first,last],'older'));
 try{
  const current=scope();await f.view.select(current);
  const existing=f.mount.querySelector('[data-id="4"]'),states=f.states.length;
  const media=f.document.createElement('video');existing.append(media);let clicks=0;media.addEventListener('click',()=>clicks++);
  f.mount.scrollTop=13;
  assert.equal(f.view.reconcileMessages([row('1'),first,row('3'),last],current),true);
  assert.deepEqual([...f.mount.querySelectorAll('article')].map(n=>n.dataset.id),['1','2','3','4']);
  assert.equal(f.mount.querySelector('video'),media);media.click();assert.equal(clicks,1);
  assert.equal(existing.dataset.previous,'3');assert.equal(f.mount.scrollTop,43);
  assert.equal(f.states.length,states+1);assert.equal(f.states.at(-1).hasMore,true);
  const same=[row('1'),first,row('3'),last];f.view.reconcileMessages(same,current);
  const before=f.states.length;assert.equal(f.view.reconcileMessages(same,current),true);assert.equal(f.states.length,before);
  assert.deepEqual(f.released,[]);
 }finally{f.close();}
});

test('native reconciliation handles reordered/removed items and clears only owned nodes',async()=>{
 const one=row('1'),two=row('2');const f=fixture(async()=>page([one,two]));
 try{
  const current=scope();await f.view.select(current);
  assert.equal(f.view.reconcileMessages([two,one],current),true);
  assert.deepEqual([...f.mount.querySelectorAll('article')].map(n=>n.dataset.id),['2','1']);
  assert.equal(f.view.reconcileMessages([row('2','updated')],current),true);
  assert.deepEqual(f.released,['1']);assert.equal(f.mount.querySelector('article').textContent,'"updated"');
  assert.equal(f.view.reconcileMessages([],current),true);assert.equal(f.states.at(-1).phase,'empty');
  assert.equal(f.view.size,0);assert.equal(f.mount.querySelectorAll('.chat-history-controls').length,1);
 }finally{f.close();}
});

test('native reconciliation rejects crossed scopes, malformed sets and loading contexts',async()=>{
 const pending=deferred();const f=fixture(()=>pending.promise);
 try{
  const current=scope();assert.equal(f.view.reconcileMessages([],current),false);
  const loading=f.view.select(current);assert.equal(f.view.reconcileMessages([],current),false);
  pending.resolve(page([row('1')]));await loading;
  assert.equal(f.view.reconcileMessages([],scope('foreign')),false);
  for(const invalid of [null,[row('')],[row('same'),row('same')]])assert.throws(()=>f.view.reconcileMessages(invalid,current));
  assert.equal(f.view.size,1);f.view.dispose();assert.equal(f.view.reconcileMessages([],current),false);
 }finally{f.close();}
});

test('native reconciliation cannot invent update support or mask an older-page error',async()=>{
 let calls=0;const original=row('one');const f=fixture(async()=>++calls===1?page([original],'older'):Promise.reject({code:'source_failed'}));
 try{
  const current=scope();await f.view.select(current);await f.view.loadOlder();
  assert.equal(f.view.reconcileMessages([original,row('two')],current),true);
  assert.equal(f.states.at(-1).phase,'error');assert.equal(f.states.at(-1).errorCode,'source_failed');
  assert.equal(f.mount.querySelector('button').textContent,'Tentar novamente');
 }finally{f.close();}
 const noUpdate=fixture(async()=>page([original]),{renderMessage(){return noUpdate.document.createElement('article');}});
 try{await noUpdate.view.select(scope());assert.equal(noUpdate.view.reconcileMessages([row('one','changed')],scope()),false);}
 finally{noUpdate.close();}
});

test('native reconciliation releases new handles on render/update failure or context redirection',async()=>{
 for(const failure of ['render','update','redirect','dispose','alias']){
  const dom=new JSDOM('<main></main>'),mount=dom.window.document.querySelector('main'),released=[];
  let view,shared,changed=false;
  const original=row('old');
  view=createProgressiveHistory(mount,{source:{loadPage:async()=>page([original])},pageSize:2,renderMessage(message){
   if(changed&&failure==='render'&&message.messageId==='bad')throw Error('fixture');
   const element=failure==='alias'&&changed?(shared||=dom.window.document.createElement('article')):dom.window.document.createElement('article');
   return {element,dispose(){released.push(message.messageId);},update(){
    if(failure==='update')throw Error('fixture');
    if(failure==='redirect')void view.select(scope('next'));
    if(failure==='dispose')view.dispose();
   }};
  }});
  try{
   await view.select(scope());changed=true;
   const messages=failure==='alias'?[row('new'),row('bad')]:[row('new'),...(failure==='render'?[row('bad')]:[row('old','changed')])];
   if(['render','update','alias'].includes(failure))assert.throws(()=>view.reconcileMessages(messages,scope()));
   else assert.equal(view.reconcileMessages(messages,scope()),false);
   assert.ok(released.includes('new'));await flush();
  }finally{view.dispose();dom.window.close();}
 }
});

test('initial loading precedes the source, opaque cursor/order and zero/null are preserved',async()=>{
 let called=false;
 const f=fixture(async args=>{called=true;assert.equal(f.mount.getAttribute('aria-busy'),'true');assert.equal(args.olderCursor,null);
  assert.equal(args.limit,2);return page([row('zero',0),row('missing',null)],'opaque:09');});
 try{
  const request=f.view.select(scope());assert.equal(called,false);assert.match(f.mount.textContent,/Carregando conversa/);
  assert.equal(await request,true);assert.deepEqual(f.rendered,['zero','missing']);
  assert.equal(f.mount.querySelector('[data-id=zero]').textContent,'0');assert.equal(f.mount.querySelector('[data-id=missing]').textContent,'null');
  assert.equal(f.view.size,2);assert.equal(f.states.at(-1).hasMore,true);
 }finally{f.close();}
});

test('prepend keeps existing bodies, listeners, metadata, draft and the reading anchor',async()=>{
 const requests=[];
 const f=fixture(async args=>{requests.push(args.olderCursor);return args.olderCursor===null?
  page([row('3'),row('4')],'cursor:03'):page([row('1'),row('2')]);});
 try{
  await f.view.select(scope());const existing=f.mount.querySelector('[data-id="3"]');let clicks=0;
  existing.addEventListener('click',()=>clicks++);f.mount.scrollTop=17;
  await f.view.loadOlder();existing.click();
  assert.equal(f.mount.querySelector('[data-id="3"]'),existing);assert.equal(clicks,1);
  assert.deepEqual([...f.mount.querySelectorAll('article')].map(n=>n.dataset.id),['1','2','3','4']);
  assert.equal(existing.dataset.previous,'2');assert.equal(f.mount.scrollTop,77);
  assert.equal(f.document.querySelector('textarea').value,'draft');assert.deepEqual(f.released,[]);
  assert.deepEqual(requests,[null,'cursor:03']);assert.equal(await f.view.loadOlder(),false);
 }finally{f.close();}
});

test('an overlapping page deduplicates by opaque ID without replacing another body',async()=>{
 let count=0;
 const f=fixture(async()=>++count===1?page([row('2'),row('3')],'old'):page([row('1'),row('2','changed historical copy')]));
 try{
  await f.view.select(scope());const current=f.mount.querySelector('[data-id="2"]');await f.view.loadOlder();
  assert.equal(f.view.size,3);assert.deepEqual(f.rendered,['2','3','1']);
  assert.equal(current.textContent,'"2"');assert.equal(current,f.mount.querySelector('[data-id="2"]'));
 }finally{f.close();}
});

test('one request per context; retry preserves the failed cursor and sanitizes source errors',async()=>{
 const pending=deferred(),calls=[];let attempt=0;
 const f=fixture(args=>{calls.push(args.olderCursor);if(!args.olderCursor)return page([row('new')],'old');
  if(++attempt===1)return pending.promise;return page([row('old')]);});
 try{
  await f.view.select(scope());const first=f.view.loadOlder(),second=f.view.loadOlder();assert.equal(first,second);
  pending.reject(Error('secret/private/source'));assert.equal(await first,false);
  assert.equal(f.states.at(-1).errorCode,'history_unavailable');assert.doesNotMatch(f.mount.textContent,/secret/);
  assert.equal(f.view.size,1);assert.equal(await f.view.retry(),true);
  assert.deepEqual(calls,[null,'old','old']);assert.equal(f.view.size,2);
 }finally{f.close();}
});

test('a source ignoring AbortSignal cannot publish a previous account with the same conversation ID',async()=>{
 const old=deferred(),signals=[];let calls=0;
 const f=fixture(args=>{signals.push(args.signal);return ++calls===1?old.promise:page([row('safe')]);});
 try{
  const before=f.view.select(scope('account-one'));await Promise.resolve();
  await f.view.select(scope('account-two'));assert.equal(signals[0].aborted,true);
  old.resolve(page([row('private')]));assert.equal(await before,false);
  assert.deepEqual(f.rendered,['safe']);assert.doesNotMatch(f.mount.textContent,/private/);
 }finally{f.close();}
});

test('invalid pages and repeated cursors fail atomically without deleting mounted content',async()=>{
 for(const invalid of [page([row('1'),row('2'),row('3')]),page([row('same'),row('same')]),
  {messages:[],page:{hasMore:false,olderCursor:'unexpected'}},page([row('older')],'repeat')]){
  let calls=0;const f=fixture(async()=>++calls===1?page([row('current')],'repeat'):invalid);
  try{
   await f.view.select(scope());assert.equal(await f.view.loadOlder(),false);
   assert.equal(f.states.at(-1).errorCode,'history_page_invalid');assert.deepEqual(f.rendered,['current']);
   assert.equal(f.view.size,1);assert.equal(calls,2);
  }finally{f.close();}
 }
});

test('native updates/removals are scoped presentation commands and dispose handles once',async()=>{
 const f=fixture(async()=>page([row('one')]));
 try{
  const current=scope();await f.view.select(current);const existing=f.mount.querySelector('article');
  assert.equal(f.view.updateMessage(row('one','changed'),scope('other')),false);
  assert.equal(f.view.updateMessage(row('one','changed'),current),true);assert.equal(f.mount.querySelector('article'),existing);
  assert.equal(f.view.appendMessage(row('two'),current),true);assert.equal(f.view.removeMessage('one',scope('other')),false);
  assert.equal(f.view.removeMessage('one',current),true);assert.equal(f.signals[0].aborted,true);
  assert.equal(f.view.removeMessage('one',current),false);f.view.dispose();f.view.dispose();
  assert.deepEqual(f.released,['one','two']);assert.equal(f.mount.children.length,0);
 }finally{f.close();}
});

test('same context does not remount, source replacement discards, and late failure cannot paint after dispose',async()=>{
 const old=deferred();const f=fixture(async()=>page([row('old')]));
 try{
  await f.view.select(scope());await f.view.select(scope());assert.deepEqual(f.rendered,['old']);
  const changing=f.view.select(scope(),{source:{loadPage:()=>old.promise}});await Promise.resolve();
  assert.deepEqual(f.released,['old']);f.view.dispose();old.reject(Error('late'));
  assert.equal(await changing,false);assert.equal(f.mount.children.length,0);
 }finally{f.close();}
});

test('host metadata errors are contained and do not advance retries to an unintended page',async()=>{
 const f=fixture(async()=>page([row('one')]),{renderMessage(message){
  const element=f.document.createElement('article');element.textContent=message.messageId;
  return {element,updateMetadata(){throw Error('private callback failure');}};
 }});
 try{assert.equal(await f.view.select(scope()),true);assert.equal(f.view.size,1);assert.equal(f.states.at(-1).phase,'ready');}
 finally{f.close();}
});

test('cursor cycles stop before mounting a page or silently looping the source',async()=>{
 let calls=0;const f=fixture(async()=>++calls===1?page([row('3')],'a'):calls===2?page([row('2')],'b'):page([row('1')],'a'));
 try{
  await f.view.select(scope());assert.equal(await f.view.loadOlder(),true);
  assert.equal(await f.view.loadOlder(),false);assert.deepEqual(f.rendered,['3','2']);
  assert.equal(f.states.at(-1).errorCode,'history_page_invalid');assert.equal(calls,3);
 }finally{f.close();}
});

test('initial empty page exposes an empty state and no hidden follow-up fetch',async()=>{
 let calls=0;const f=fixture(async()=>{calls++;return page([]);});
 try{
  assert.equal(await f.view.loadOlder(),false);assert.equal(await f.view.retry(),false);
  await f.view.select(scope());assert.equal(f.states.at(-1).phase,'empty');
  assert.equal(f.mount.getAttribute('aria-busy'),'false');assert.equal(f.view.size,0);
  assert.equal(await f.view.loadOlder(),false);assert.equal(calls,1);
 }finally{f.close();}
});
test('constructor and selection validate adapters, page size and scope before dispatch',()=>{
 const dom=new JSDOM('<main></main>'),mount=dom.window.document.querySelector('main');
 try{
  assert.throws(()=>createProgressiveHistory(null,{}),/adapter_required/);
  for(const pageSize of [0,-1,1.5,NaN,101])
   assert.throws(()=>createProgressiveHistory(mount,{source:{loadPage(){}},renderMessage(){},pageSize}),/page_size_invalid/);
  const f=fixture(()=>{throw Error('must not dispatch');});
  try{
   assert.throws(()=>f.view.select({key:'',conversationId:'chat'}),/scope_required/);
   assert.throws(()=>f.view.select(scope(),{source:{}}),/scope_required/);
   f.view.dispose();assert.throws(()=>f.view.select(scope()),/disposed/);
  }finally{f.close();}
 }finally{dom.window.close();}
});
test('a failed render rolls back only the new page; retry preserves the original nodes',async()=>{
 let attempts=0,disposed=0;const f=fixture(async({olderCursor})=>olderCursor?page([row('1'),row('2')]):page([row('3')],'old'),
 {renderMessage(message,{signal}){
  if(message.messageId==='2'&&attempts++===0)throw Error('PRIVATE_RENDER_FAILURE');
  const element=f.document.createElement('article');element.dataset.id=message.messageId;
  return {element,dispose(){assert.equal(signal.aborted,true);disposed++;}};
 }});
 try{
  await f.view.select(scope());const old=f.mount.querySelector('article');
  assert.equal(await f.view.loadOlder(),false);assert.equal(f.mount.querySelector('article'),old);
  assert.equal(f.view.size,1);assert.equal(disposed,1);assert.doesNotMatch(f.mount.textContent,/PRIVATE/);
  assert.equal(await f.view.retry(),true);assert.equal(f.view.size,3);
  assert.equal(f.mount.querySelector('[data-id="3"]'),old);
 }finally{f.close();}
 assert.equal(disposed,4);
});
test('a malformed render handle releases its allocated resources without mounting foreign DOM',async()=>{
 const other=new JSDOM('<article></article>');let disposed=0,aborted=false;
 const f=fixture(async()=>page([row('one')]),{renderMessage(message,{signal}){
  return {element:other.window.document.querySelector('article'),dispose(){disposed++;aborted=signal.aborted;}};
 }});
 try{
  assert.equal(await f.view.select(scope()),false);assert.equal(f.view.size,0);
  assert.equal(f.states.at(-1).errorCode,'history_page_invalid');
  assert.equal(disposed,1);assert.equal(aborted,true);
  assert.ok(other.window.document.querySelector('article'));
 }finally{f.close();other.window.close();}
});
test('returning an already-owned node is rejected without disposing or removing that message',async()=>{
 let renders=0,released=0,original;
 const f=fixture(async({olderCursor})=>olderCursor?page([row('older')]):page([row('original')],'old'),
 {renderMessage(){renders++;original||=f.document.createElement('article');return {element:original,dispose(){released++;}};}});
 try{
  await f.view.select(scope());assert.equal(await f.view.loadOlder(),false);
  assert.equal(f.view.size,1);assert.equal(f.mount.querySelector('article'),original);
  assert.equal(released,0);assert.equal(renders,2);
 }finally{f.close();}
 assert.equal(released,1);
});
test('explicit retry button and scoped update guards do not lose the mounted body',async()=>{
 let attempts=0;const f=fixture(async()=>{if(!attempts++)throw {code:'source_busy'};return page([row('one')]);});
 try{
  await f.view.select(scope());assert.equal(f.states.at(-1).errorCode,'source_busy');
  f.mount.querySelector('button').click();await flush();
  assert.equal(f.view.size,1);assert.equal(f.view.updateMessage(row('missing'),scope()),false);
  assert.equal(f.view.appendMessage(row('two'),scope('other')),false);
  assert.equal(f.view.removeMessage('missing',scope()),false);
 }finally{f.close();}
});

test('default message key and diagnostics work with a native Element callback',async()=>{
 const dom=new JSDOM('<main></main>'),mount=dom.window.document.querySelector('main');
 const view=createProgressiveHistory(mount,{source:{loadPage:async()=>page([row('opaque')])},
  renderMessage(){return dom.window.document.createElement('article');}});
 try{assert.equal(await view.select(scope()),true);assert.equal(view.size,1);}
 finally{view.dispose();dom.window.close();}
});
