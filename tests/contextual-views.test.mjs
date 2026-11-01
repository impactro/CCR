import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createContextualViewHost} from '../src/contextual-views.mjs';
const deferred=()=>{let resolve;const promise=new Promise(yes=>resolve=yes);return {promise,resolve};};
const scope=(accountId='account-a',collectionId='inbox')=>({key:JSON.stringify(['human-a',accountId,collectionId]),workspaceId:'human-a',accountId,collectionId});
function fixture(driver={}){
 const dom=new JSDOM('<aside></aside><main></main>'),document=dom.window.document,states=[],disposed=[];
 const render=(value,{signal})=>{const element=document.createElement('p');element.textContent=String(value);
  return {element,dispose(){assert.equal(signal.aborted,true);disposed.push(value);}};};
 const view=createContextualViewHost({navigation:document.querySelector('aside'),content:document.querySelector('main'),onState:s=>states.push(s)});
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
