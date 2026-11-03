/** Action descriptors are trusted host code, never document/AI JSON. */
const ORDER={reply:10,react:20,copy:30,listen:35,preview:40,open:45,download:50,export:55,forward:60,delete:70};
const PATHS={reply:'<path d="m10 5-7 6 7 6v-4c7 0 10 2 11 6 1-8-3-11-11-11z"/>',react:'<circle cx="12" cy="12" r="9"/><path d="M8 14c2 3 6 3 8 0M8 8h.01M16 8h.01"/>',copy:'<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',preview:'<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',download:'<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',forward:'<path d="m12 5 7 7-7 7M5 5l7 7-7 7"/>'};
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
PATHS.delete='<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>';
PATHS.listen='<path d="M4 9h4l5-4v14l-5-4H4zM16 8a6 6 0 0 1 0 8M19 5a10 10 0 0 1 0 14"/>';
const defaultIcon=kind=>`<svg viewBox="0 0 24 24" aria-hidden="true">${PATHS[({smile:'react',search:'preview'})[kind]||kind]||PATHS.download}</svg>`;
const validId=value=>typeof value==='string'&&value.length>0&&value.length<=512&&!/[\u0000-\u001f]/.test(value);
const sameScope=(a,b)=>a?.conversationId===b?.conversationId&&a?.messageId===b?.messageId;
function sorted(actions){
 const ids=new Set();
 return (Array.isArray(actions)?actions:[]).filter(action=>{
  if(!action||!validId(action.actionId)||ids.has(action.actionId)||!Object.hasOwn(ORDER,action.kind)||action.visible===false)return false;
  ids.add(action.actionId);return typeof action.invoke==='function'||typeof action.resolveLink==='function'||action.element||typeof action.data?.action==='string';
 }).slice(0,32).sort((a,b)=>ORDER[a.kind]-ORDER[b.kind]);
}
function linkFor(action){
 if(typeof action.resolveLink!=='function')return null;
 try{
  const link=action.resolveLink();if(!link||typeof link.href!=='string'||link.href.length>4096)return null;
  const url=new URL(link.href,'https://host.invalid/');
  if(!['http:','https:','blob:'].includes(url.protocol)||url.username||url.password)return null;
  return link;
 }catch{return null;}
}
function markup(action,{escape=esc,icon=defaultIcon}={},link=linkFor(action)){
 const data=Object.entries(action.data||{}).filter(([key,value])=>/^[a-z][a-z0-9-]*$/.test(key)&&typeof value==='string').map(([key,value])=>` data-${key}="${escape(value)}"`).join('');
 const disabled=action.enabled===false||action.pending===true;
 const shared=` data-chat-action-id="${escape(action.actionId)}"${data} title="${escape(action.label||action.kind)}" aria-label="${escape(action.label||action.kind)}"`;
 const image=icon(action.icon||({react:'smile',preview:'search',open:'search',export:'download'})[action.kind]||action.kind);
 if(typeof action.resolveLink==='function'&&!link)return '';
 if(link)return `<a class="${escape(action.className||'icon-btn chat-message-action')}" href="${escape(link.href)}"${typeof link.download==='string'?` download="${escape(link.download)}"`:' target="_blank" rel="noopener noreferrer"'}${shared}${disabled?' aria-disabled="true" tabindex="-1"':''}>${image}</a>`;
 return `<button class="${escape(action.className||'icon-btn chat-message-action')}" type="button"${shared} ${disabled?'disabled':''}>${image}</button>`;
}

/** Pure markup for hosts with their own delegated action dispatcher (CWH). */
export function renderMessageActions(actions,options={}){
 return sorted(actions).filter(action=>!action.element).map(action=>markup(action,options)).join('');
}

/** Keyed external rail. Updating it never touches the body/player/PDF/draft.
 * invoke({scope,actionId,resourceId,signal,event}) runs inside the click gesture.
 * Pending blocks reentry; late completion after removal/scope/dispose is ignored.
 * resolveLink is a synchronous HOST grant; native link gestures are preserved.
 * element is an optional original host export control, adopted without cloning.
 */
export function createMessageActionRail(container,{scope,actions=[],signal,onError=()=>{},onFeedback=()=>{},icon=defaultIcon}={}){
 const document=container.ownerDocument,records=new Map();let currentScope=null,controller=null,disposed=false;
 container.classList.add('chat-action-rail');
 function release(record){record.operation?.abort();record.node.removeEventListener('click',record.click);try{record.action.dispose?.();}catch{}}
 function reset(){controller?.abort();for(const record of records.values())release(record);records.clear();container.replaceChildren();}
 function paint(record){
  const action=record.action,node=record.node;
  if(action.element){if(action.enabled!==undefined)node.disabled=action.enabled===false||action.pending===true;return;}
  const next=document.createElement('template');next.innerHTML=markup({...action,pending:record.busy||action.pending},{icon},record.link);
  const desired=next.content.firstElementChild;if(!desired)return;
  for(const attr of [...node.attributes])if(!desired.hasAttribute(attr.name))node.removeAttribute(attr.name);
  for(const attr of desired.attributes)node.setAttribute(attr.name,attr.value);
  node.innerHTML=desired.innerHTML;
 }
 function update(next){
  if(disposed)throw Error('action_rail_disposed');
  if(!validId(next.scope?.conversationId)||!validId(next.scope?.messageId))throw Error('action_scope_required');
  if(!sameScope(currentScope,next.scope)){reset();currentScope={...next.scope};controller=new AbortController();}
  const selected=sorted(next.actions).filter(action=>!action.scope||sameScope(action.scope,currentScope)),keep=new Set();let position=0;
  for(const action of selected){
   const link=linkFor(action);
   if(typeof action.resolveLink==='function'&&!link)continue;
   keep.add(action.actionId);let record=records.get(action.actionId);
   if(record&&(record.action.resourceId!==action.resourceId||record.action.element!==action.element||record.action.kind!==action.kind||Boolean(record.link)!==Boolean(link))){
    release(record);record.node.remove();records.delete(action.actionId);record=null;
   }
   if(!record){
    let node=action.element;
    if(node&&(!node.nodeType||node.ownerDocument!==document))throw Error('action_element_invalid');
    if(!node){const template=document.createElement('template');template.innerHTML=markup(action,{icon},link);node=template.content.firstElementChild;}
    if(!node)continue;
    record={action,node,link,busy:false,operation:null};
    record.click=event=>{
     const live=record.action;
     if(disposed||records.get(live.actionId)!==record||controller.signal.aborted||record.busy||live.visible===false||live.enabled===false||live.pending===true||record.node.disabled){event.preventDefault();return;}
     if(typeof live.invoke!=='function')return; // Native host control/link.
     event.preventDefault();record.busy=true;paint(record);
     const operation=new AbortController(),epoch=controller;record.operation=operation;
     const abort=()=>operation.abort();epoch.signal.addEventListener('abort',abort,{once:true});
     const active=()=>!disposed&&!epoch.signal.aborted&&!operation.signal.aborted&&records.get(live.actionId)===record;
     let result;try{result=live.invoke({scope:{...currentScope,...live.scope},actionId:live.actionId,resourceId:live.resourceId,signal:operation.signal,event});}catch{result=Promise.reject(Error('action_failed'));}
     Promise.resolve(result).then(value=>{if(active())try{onFeedback({actionId:live.actionId,status:value?.status||'done',feedback:typeof value?.feedback==='string'?value.feedback.slice(0,180):null});}catch{}},()=>{if(active())try{onError({actionId:live.actionId,code:'action_failed'});}catch{}}).finally(()=>{
      epoch.signal.removeEventListener('abort',abort);
      if(active()){record.busy=false;record.operation=null;paint(record);}
     });
    };
    node.addEventListener('click',record.click);records.set(action.actionId,record);
   }
   record.action=action;record.link=link;paint(record);
   if(container.children[position]!==record.node)container.insertBefore(record.node,container.children[position]||null);
   position++;
  }
  for(const [id,record] of records)if(!keep.has(id)){release(record);record.node.remove();records.delete(id);}
 }
 function dispose(){if(disposed)return;disposed=true;reset();signal?.removeEventListener('abort',dispose);}
 if(signal?.aborted)dispose();else{signal?.addEventListener('abort',dispose,{once:true});update({scope,actions});}
 return {update,dispose,get scope(){return currentScope&&{...currentScope};}};
}
