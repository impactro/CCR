/** Presentation only. Sources and message callbacks are trusted host adapters. */
import {bindConversationInteractions} from './conversation.mjs';
const id=value=>typeof value==='string'&&value.length>0&&value.length<=4096&&!/[\u0000-\u001f]/.test(value);
const validScope=scope=>scope&&id(scope.key)&&id(scope.conversationId);
const sameScope=(left,right)=>left?.key===right?.key&&left?.conversationId===right?.conversationId;
const errorCode=error=>/^[a-z][a-z0-9_]{0,79}$/.test(error?.code||'')?error.code:'history_unavailable';
const invalid=()=>Object.assign(Error('Invalid history page'),{code:'history_page_invalid'});

export const PROGRESSIVE_HISTORY_VERSION=1;

export function createProgressiveHistory(mount,{
 source,renderMessage,messageKey=message=>message.messageId,pageSize=20,maxPageSize=100,onState=()=>{},onIssue=()=>{},
}={}){
 if(mount?.nodeType!==1||!mount.ownerDocument||typeof source?.loadPage!=='function'||typeof renderMessage!=='function')throw Error('history_adapter_required');
 if(!Number.isSafeInteger(pageSize)||!Number.isSafeInteger(maxPageSize)||pageSize<1||pageSize>maxPageSize||maxPageSize>10000)throw Error('history_page_size_invalid');
 const document=mount.ownerDocument,window=document.defaultView;
 const disposeInteractions=bindConversationInteractions(mount);
 const controls=document.createElement('div'),status=document.createElement('div'),more=document.createElement('button');
 controls.className='chat-history-controls';status.className='chat-history-status';status.setAttribute('role','status');
 status.setAttribute('aria-live','polite');more.type='button';more.className='chat-history-older';more.hidden=true;
 controls.append(status,more);mount.prepend(controls);
 let context=null,disposed=false;
 const live=current=>!disposed&&context===current&&!current.controller.signal.aborted;
 function publish(current,phase,code=null){
  if(!live(current))return;
  current.phase=phase;current.errorCode=code;
  const loading=phase==='loading'||phase==='older-loading',failed=phase==='error';
  mount.setAttribute('aria-busy',String(loading));status.setAttribute('role',failed?'alert':'status');
  status.textContent=phase==='loading'?'Carregando conversa…':phase==='older-loading'?'Carregando mensagens anteriores…':
   failed?'Não foi possível carregar o histórico.':phase==='empty'?'Nenhuma mensagem.':
   !current.page?.hasMore?'Início do histórico.':'';
  more.hidden=!failed&&!current.page?.hasMore;
  more.disabled=loading;more.textContent=failed?'Tentar novamente':'Carregar mensagens anteriores';
  const state=Object.freeze({phase,errorCode:code,hasMore:current.page?.hasMore===true,count:current.items.size,
   scope:current.scope,canRetry:failed});
  try{onState(state);}catch{} // Diagnostics never break presentation or authorize work.
 }
 function release(handle){
  if(handle.released)return;handle.released=true;handle.controller.abort();
  try{handle.dispose?.();}catch{}finally{handle.element.remove();}
 }
 function clear(current){
  if(!current)return;current.controller.abort();
  for(const handle of current.items.values())release(handle);
  current.items.clear();
 }
 function metadata(current){
  let previousMessage;
  for(const handle of current.items.values()){
   try{handle.updateMetadata?.({previousMessage,scope:current.scope});}catch{try{onIssue('history_metadata_failed');}catch{}}
   previousMessage=handle.message;
  }
 }
 function makeHandle(current,message){
  const controller=new window.AbortController();
  const abort=()=>controller.abort();current.controller.signal.addEventListener('abort',abort,{once:true});
  let rendered;
  try{rendered=renderMessage(message,{signal:controller.signal,scope:current.scope,previousMessage:null});}
  catch(error){controller.abort();current.controller.signal.removeEventListener('abort',abort);throw error;}
  const handle=rendered?.nodeType?{element:rendered}:rendered;
  if(!handle?.element||handle.element.ownerDocument!==document||handle.element.nodeType!==1){
   controller.abort();current.controller.signal.removeEventListener('abort',abort);
   try{handle?.dispose?.();}catch{}
   throw invalid();
  }
  if([...current.items.values()].some(old=>old.element===handle.element)){
   controller.abort();current.controller.signal.removeEventListener('abort',abort);throw invalid();
  }
  const dispose=handle.dispose;
  return {...handle,message,controller,released:false,dispose(){
   current.controller.signal.removeEventListener('abort',abort);dispose?.();
  }};
 }
 function validatePage(result,cursor,current){
  if(!result||!Array.isArray(result.messages)||result.messages.length>pageSize||!result.page||typeof result.page.hasMore!=='boolean')throw invalid();
  const {hasMore,olderCursor}=result.page;
  if(hasMore?(!id(olderCursor)||olderCursor===cursor||current.cursors.has(olderCursor)):olderCursor!==null)throw invalid();
  const seen=new Set();
  for(const message of result.messages){
   const key=messageKey(message);if(!id(key)||seen.has(key))throw invalid();seen.add(key);
  }
  return result;
 }
 function commitPage(current,result,older){
  const previous=[...current.items.values()],anchor=previous[0]?.element;
  const anchorOffset=older&&anchor?anchor.offsetTop:0,scrollTop=mount.scrollTop;
  const additions=[];const elements=new Set(previous.map(handle=>handle.element));
  try{
   for(const message of result.messages){
    const key=messageKey(message);if(current.items.has(key))continue;
    const handle=makeHandle(current,message);
    if(elements.has(handle.element)){release(handle);throw invalid();}
    elements.add(handle.element);additions.push([key,handle]);
   }
  }catch(error){for(const [,handle]of additions)release(handle);throw error;}
  const fragment=document.createDocumentFragment();for(const [,handle]of additions)fragment.append(handle.element);
  if(older&&anchor)mount.insertBefore(fragment,anchor);else mount.append(fragment);
  current.items=new Map(older?[...additions,...current.items]:[...current.items,...additions]);
  current.page={...result.page};if(result.page.hasMore)current.cursors.add(result.page.olderCursor);metadata(current);
  publish(current,current.items.size?'ready':'empty');
  if(live(current)&&older&&anchor)mount.scrollTop=scrollTop+anchor.offsetTop-anchorOffset;
 }
 function request(current,older){
  if(!live(current))return Promise.resolve(false);
  if(current.pending)return current.pending;
  if(older&&!current.page?.hasMore)return Promise.resolve(false);
  const cursor=older?current.page.olderCursor:null;
  current.failedRequest=null;
  // Defer the call only after the loading state has reached the DOM.
  const pending=Promise.resolve().then(()=>{
   if(!live(current))return null;
   return current.source.loadPage({conversationId:current.scope.conversationId,olderCursor:cursor,limit:pageSize,signal:current.controller.signal});
  }).then(result=>{
   if(!live(current))return false;
   validatePage(result,cursor,current);commitPage(current,result,older);return true;
  }).catch(error=>{
   if(!live(current))return false;
   current.failedRequest={older};publish(current,'error',errorCode(error));return false;
  }).finally(()=>{if(live(current)&&current.pending===pending)current.pending=null;});
  current.pending=pending;publish(current,older?'older-loading':'loading');return pending;
 }
 function select(scope,{source:nextSource=source}={}){
  if(disposed)throw Error('history_disposed');
  if(!validScope(scope)||typeof nextSource?.loadPage!=='function')throw Error('history_scope_required');
  if(context&&sameScope(context.scope,scope)&&context.source===nextSource)return context.pending||Promise.resolve(context.phase!=='error');
  clear(context);
  context={scope:Object.freeze({key:scope.key,conversationId:scope.conversationId}),source:nextSource,
   controller:new window.AbortController(),items:new Map(),page:null,pending:null,failedRequest:null,cursors:new Set()};
  return request(context,false);
 }
 function retry(){return context?.failedRequest?request(context,context.failedRequest.older):Promise.resolve(false);}
 function loadOlder(){return context?request(context,true):Promise.resolve(false);}
 function updateMessage(message,scope){
  if(!context||!live(context)||!sameScope(context.scope,scope))return false;
  const handle=context.items.get(messageKey(message));if(!handle||typeof handle.update!=='function')return false;
  handle.update(message,{signal:handle.controller.signal,scope:context.scope});handle.message=message;metadata(context);return true;
 }
 function appendMessage(message,scope){
  if(!context||!live(context)||!sameScope(context.scope,scope)||context.pending||!context.page)return false;
  const key=messageKey(message);if(!id(key))throw invalid();
  if(context.items.has(key))return updateMessage(message,scope);
  const handle=makeHandle(context,message);context.items.set(key,handle);mount.append(handle.element);
  metadata(context);publish(context,'ready');return true;
 }
 function removeMessage(key,scope){
  if(!context||!live(context)||!sameScope(context.scope,scope))return false;
  const handle=context.items.get(key);if(!handle)return false;
  context.items.delete(key);release(handle);metadata(context);publish(context,context.items.size?'ready':'empty');return true;
 }
 function dispose(){if(disposed)return;disposed=true;clear(context);context=null;disposeInteractions();more.removeEventListener('click',click);controls.remove();mount.removeAttribute('aria-busy');}
 const click=()=>{void(context?.failedRequest?retry():loadOlder());};more.addEventListener('click',click);
 return {select,loadOlder,retry,updateMessage,appendMessage,removeMessage,dispose,
  get scope(){return context?.scope||null;},get size(){return context?.items.size||0;}};
}
