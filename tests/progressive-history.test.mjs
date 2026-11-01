import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createProgressiveHistory} from '../src/progressive-history.mjs';

const scope=(key='user-one/account-one/chat',conversationId='chat')=>({key,conversationId});
const row=(messageId,value=messageId)=>({messageId,value,createdAt:1});
const page=(messages,olderCursor=null)=>({messages,page:{hasMore:olderCursor!==null,olderCursor}});
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
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
