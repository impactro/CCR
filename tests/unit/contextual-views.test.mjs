import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createContextualViewHost} from '../../src/contextual-views.mjs';
import {deferred,flush} from '../helpers/async.mjs';
const scope=(accountId='account-a',collectionId='inbox')=>({key:JSON.stringify(['human-a',accountId,collectionId]),workspaceId:'human-a',accountId,collectionId});
function fixture(driver={},options={}){
 const dom=new JSDOM('<aside></aside><main></main>'),document=dom.window.document,states=[],disposed=[];
 const render=(value,{signal})=>{const element=document.createElement('p');element.textContent=String(value);
  return {element,dispose(){assert.equal(signal.aborted,true);disposed.push(value);}};};
 const view=createContextualViewHost({navigation:document.querySelector('aside'),content:document.querySelector('main'),onState:s=>{states.push(s);options.onState?.(s);}});
 view.register('mail',{loadNavigation:async()=> 'list',renderNavigation:render,loadContent:async({scope})=>scope.itemId,renderContent:render,...driver});
 return {dom,document,view,states,disposed,close(){view.dispose();dom.window.close();}};
}
test('independent regions load immediately; content does not await the navigation source',async()=>{
 const wait=deferred(),f=fixture({loadNavigation:()=>wait.promise});
 try{
  const navigation=f.view.selectArea('mail',scope());
  assert.equal(f.document.querySelector('aside').getAttribute('aria-busy'),'true');
  await f.view.selectItem('message');assert.equal(f.document.querySelector('main p').textContent,'message');
  assert.equal(f.document.querySelector('aside').getAttribute('aria-busy'),'true');
  wait.resolve('folders-and-list');assert.equal(await navigation,true);
  assert.equal(f.document.querySelector('aside p').textContent,'folders-and-list');
 }finally{f.close();}
});
test('account and collection changes clear prior data and reject late responses even without source cancellation',async()=>{
 const old=deferred(),signals=[];let calls=0;
 const f=fixture({loadContent:args=>{signals.push(args.signal);return ++calls===1?old.promise:'safe';}});
 try{
  await f.view.selectArea('mail',scope());const loading=f.view.selectItem('same-message');
  await f.view.selectArea('mail',scope('account-b','sent'));assert.equal(signals[0].aborted,true);
  assert.equal(f.document.querySelector('main p'),null);await f.view.selectItem('same-message');
  old.resolve('private previous account');assert.equal(await loading,false);
  assert.equal(f.document.querySelector('main p').textContent,'safe');
 }finally{f.close();}
});
test('errors and retry are per region; no raw provider error enters the DOM',async()=>{
 let calls=0;const f=fixture({loadNavigation:async()=>{if(++calls===1)throw Error('PRIVATE_PROVIDER_URL_TOKEN');return 'retried';}});
 try{
  assert.equal(await f.view.selectArea('mail',scope()),false);await f.view.selectItem('readable');
  assert.equal(f.document.querySelector('aside [role=alert]').textContent,'Não foi possível carregar.');
  assert.doesNotMatch(f.document.body.textContent,/PRIVATE_PROVIDER/);
  assert.equal(await f.view.retry('navigation'),true);assert.equal(f.document.querySelector('main p').textContent,'readable');
 }finally{f.close();}
});
test('stale list callbacks cannot select another account; suspend disposes content and removes selection',async()=>{
 let oldSelect;const f=fixture({renderNavigation(value,{selectItem}){oldSelect||=selectItem;return f.document.createElement('ul');}});
 try{
  await f.view.selectArea('mail',scope());await f.view.selectItem('old');
  await f.view.selectArea('mail',scope('account-b'));assert.equal(await oldSelect('injected'),false);
  assert.equal(f.view.context.itemId,null);assert.deepEqual(f.disposed,['old']);
  await f.view.selectItem('new');f.view.suspend();assert.equal(f.view.context,null);
  assert.equal(f.document.querySelector('main p'),null);assert.deepEqual(f.disposed,['old','new']);
  f.view.dispose();f.view.dispose();assert.equal(f.document.querySelector('main').children.length,0);
 }finally{f.close();}
});
test('unregistered areas and missing owner context fail before calling any source',()=>{
 const f=fixture();try{
  assert.throws(()=>f.view.selectArea('missing',scope()),/unavailable/);
  assert.throws(()=>f.view.selectArea('mail',{key:'x',accountId:'a'}),/scope_required/);
  assert.throws(()=>f.view.register('mail',{}),/adapter_invalid/);
 }finally{f.close();}
});

test('invalid regions fail before touching either document',()=>{
 const a=new JSDOM('<aside><main></main></aside>'),b=new JSDOM('<main></main>');
 try{
  const aside=a.window.document.querySelector('aside'),nested=a.window.document.querySelector('main');
  for(const content of [aside,nested,b.window.document.querySelector('main'),null])
   assert.throws(()=>createContextualViewHost({navigation:aside,content}),/view_regions_required/);
  assert.equal(aside.children.length,1);
 }finally{a.window.close();b.window.close();}
});
test('native retry retries only the failed region and ignores diagnostic callback errors',async()=>{
 let calls=0;const f=fixture({loadContent:async()=>{if(++calls===1)throw {code:'content_offline'};return 'recovered';}},
  {onState(){throw Error('diagnostic only');}});
 try{
  await f.view.selectArea('mail',scope());const list=f.document.querySelector('aside p');
  assert.equal(await f.view.selectItem('one'),false);assert.equal(f.states.at(-1).errorCode,'content_offline');
  f.document.querySelector('main button').click();await flush();
  assert.equal(f.document.querySelector('main p').textContent,'recovered');
  assert.equal(f.document.querySelector('aside p'),list);assert.equal(calls,2);
 }finally{f.close();}
});
for(const invalid of [null,{},'raw HTML'])test('invalid render handle is a recoverable region failure: '+JSON.stringify(invalid),async()=>{
 const f=fixture({renderContent:()=>invalid});
 try{
  await f.view.selectArea('mail',scope());assert.equal(await f.view.selectItem('one'),false);
  assert.equal(f.states.at(-1).errorCode,'view_handle_invalid');
  assert.equal(f.document.querySelector('main .chat-view-region').children.length,0);
  assert.equal(f.document.querySelector('aside p').textContent,'list');
 }finally{f.close();}
});
test('suspend during render disposes a just-created handle exactly once',async()=>{
 let released=0;const f=fixture({renderContent(value,{signal}){
  const element=f.document.createElement('article');f.view.suspend();
  return {element,dispose(){assert.equal(signal.aborted,true);released++;}};
 }});
 try{
  await f.view.selectArea('mail',scope());assert.equal(await f.view.selectItem('one'),false);
  assert.equal(released,1);assert.equal(f.view.context,null);
  assert.equal(f.document.querySelector('article'),null);
 }finally{f.close();}
 assert.equal(released,1);
});
test('late rejection after suspend cannot paint error or restore private content',async()=>{
 const pending=deferred(),f=fixture({loadContent:()=>pending.promise});
 try{
  await f.view.selectArea('mail',scope());const request=f.view.selectItem('one');f.view.suspend();
  pending.reject(Error('PRIVATE_LATE_ERROR'));assert.equal(await request,false);
  assert.equal(f.document.querySelector('[role=alert]'),null);assert.equal(f.view.context,null);
 }finally{f.close();}
});
test('dispose does not publish callbacks that can resurrect an area',async()=>{
 let disposing=false,callbacks=0;const f=fixture({}, {onState(){if(disposing)callbacks++;}});
 await f.view.selectArea('mail',scope());await f.view.selectItem('one');
 disposing=true;f.view.dispose();assert.equal(callbacks,0);
 assert.equal(f.view.context,null);assert.equal(f.document.querySelector('main').children.length,0);
 assert.throws(()=>f.view.register('other',{}),/disposed/);
 assert.throws(()=>f.view.selectArea('mail',scope()),/disposed/);
 assert.equal(await f.view.selectItem('one'),false);assert.equal(await f.view.retry('content'),false);
 f.close();
});
test('a state callback can suspend loading before the source is called',async()=>{
 let calls=0,armed=false;const f=fixture({loadContent:async()=>{calls++;return 'unused';}},
 {onState(state){if(armed&&state.region==='content'&&state.phase==='loading')f.view.suspend();}});
 try{
  await f.view.selectArea('mail',scope());armed=true;
  assert.equal(await f.view.selectItem('one'),false);assert.equal(calls,0);
 }finally{f.close();}
});
test('invalid item and retry region never dispatch work',async()=>{
 const f=fixture();try{
  assert.equal(await f.view.selectItem('one'),false);
  await f.view.selectArea('mail',scope());
  assert.throws(()=>f.view.selectItem(''),/view_item_required/);
  assert.throws(()=>f.view.retry('secret'),/view_region_invalid/);
 }finally{f.close();}
});

test('current navigation callback selects content without replacing its own list',async()=>{
 let select;const f=fixture({renderNavigation(value,context){select=context.selectItem;return f.document.createElement('ul');}});
 try{
  await f.view.selectArea('mail',scope());const list=f.document.querySelector('ul');
  assert.equal(await select('selected'),true);
  assert.equal(f.document.querySelector('main p').textContent,'selected');
  assert.equal(f.document.querySelector('ul'),list);
 }finally{f.close();}
});

test('context redirection from a state callback dispatches only the final navigation',async()=>{
 const calls=[];let redirect=true;
 const f=fixture({loadNavigation:async({scope})=>{calls.push(scope.accountId);return scope.accountId;}},
 {onState(state){if(redirect&&state.region==='content'&&state.phase==='empty'&&state.context?.accountId==='account-a'){
  redirect=false;void f.view.selectArea('mail',scope('account-b'));
 }}});
 try{
  assert.equal(await f.view.selectArea('mail',scope()),false);await flush();
  assert.deepEqual(calls,['account-b']);
  assert.equal(f.document.querySelector('aside p').textContent,'account-b');
 }finally{f.close();}
});

test('an invalid foreign handle is aborted and released before presenting a recoverable error',async()=>{
 const foreign=new JSDOM('<article></article>');let released=0;
 const f=fixture({renderContent(value,{signal}){return {element:foreign.window.document.querySelector('article'),
  dispose(){assert.equal(signal.aborted,true);released++;}};}});
 try{
  await f.view.selectArea('mail',scope());assert.equal(await f.view.selectItem('one'),false);
  assert.equal(released,1);assert.equal(f.states.at(-1).errorCode,'view_handle_invalid');
  assert.equal(f.document.querySelector('article'),null);assert.ok(foreign.window.document.querySelector('article'));
 }finally{f.close();foreign.window.close();}
 assert.equal(released,1);
});

test('a dispose callback reentering suspend cannot dispose the same handle twice',async()=>{
 let released=0;const f=fixture({renderContent(){return {element:f.document.createElement('article'),
  dispose(){released++;if(released===1)f.view.suspend();}};}});
 try{
  await f.view.selectArea('mail',scope());await f.view.selectItem('one');f.view.suspend();
  assert.equal(released,1);assert.equal(f.document.querySelector('article'),null);
 }finally{f.close();}
});
