/** Two presentation regions; trusted host adapters own data, paging and effects. */
const opaque=value=>typeof value==='string'&&value.length>0&&value.length<=4096&&!/[\u0000-\u001f]/.test(value);
const codeOf=error=>/^[a-z][a-z0-9_]{0,79}$/.test(error?.code||'')?error.code:'view_unavailable';

export function createContextualViewHost({navigation,content,onState=()=>{}}={}){
 if(navigation?.nodeType!==1||content?.nodeType!==1||!navigation.ownerDocument||content.ownerDocument!==navigation.ownerDocument||navigation===content||navigation.contains(content)||content.contains(navigation))
  throw Error('view_regions_required');
 const document=navigation.ownerDocument,window=document.defaultView,adapters=new Map();
 let disposed=false,context=null,revision=0;
 const regions={};
 for(const [name,mount]of Object.entries({navigation,content})){
  const status=document.createElement('div'),body=document.createElement('div'),retry=document.createElement('button');
  status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.className='chat-view-status';
  retry.type='button';retry.textContent='Tentar novamente';retry.hidden=true;body.className='chat-view-region';
  const region={mount,status,body,retry,handle:null,controller:null,phase:'empty',request:0};
  retry.addEventListener('click',()=>{void run(name);});mount.append(status,retry,body);regions[name]=region;
 }
 function publish(name,phase,code=null){
  const region=regions[name];region.phase=phase;region.mount.setAttribute('aria-busy',String(phase==='loading'));
  region.status.setAttribute('role',phase==='error'?'alert':'status');
  region.status.textContent=phase==='loading'?'Carregando…':phase==='error'?'Não foi possível carregar.':
   phase==='empty'?(name==='content'?'Selecione um item.':'Nenhum item.') : '';
  region.retry.hidden=phase!=='error';
  try{onState(Object.freeze({region:name,phase,errorCode:code,context}));}catch{}
 }
 function release(region){
  region.request++;region.controller?.abort();region.controller=null;
  try{region.handle?.dispose?.();}catch{}region.handle=null;region.body.replaceChildren();
 }
 async function run(name){
  if(disposed||!context)return false;
  const region=regions[name],adapter=adapters.get(context.areaId),snapshot=context;
  const load=name==='navigation'?adapter.loadNavigation:adapter.loadContent;
  const render=name==='navigation'?adapter.renderNavigation:adapter.renderContent;
  if(name==='content'&&!snapshot.itemId){release(region);publish(name,'empty');return false;}
  release(region);const request=region.request,controller=new window.AbortController();region.controller=controller;
  const live=()=>!disposed&&context?.revision===snapshot.revision&&(name==='navigation'||context===snapshot)&&region.request===request&&!controller.signal.aborted;
  publish(name,'loading');
  try{
   const value=await load({scope:snapshot,signal:controller.signal});if(!live())return false;
   const rendered=render(value,{scope:snapshot,signal:controller.signal,
    selectItem:itemId=>context?.revision===snapshot.revision?selectItem(itemId):Promise.resolve(false)});
   const handle=rendered?.nodeType?{element:rendered}:rendered;
   if(!handle?.element||handle.element.nodeType!==1||handle.element.ownerDocument!==document)
    throw Object.assign(Error('Invalid view handle'),{code:'view_handle_invalid'});
   if(!live()){try{handle.dispose?.();}catch{}return false;}
   region.handle=handle;region.body.append(handle.element);publish(name,'ready');return true;
  }catch(error){if(live())publish(name,'error',codeOf(error));return false;}
 }
 function register(areaId,adapter){
  if(disposed)throw Error('view_disposed');
  if(!opaque(areaId)||adapters.has(areaId)||!['loadNavigation','renderNavigation','loadContent','renderContent'].every(key=>typeof adapter?.[key]==='function'))
   throw Error('view_adapter_invalid');
  adapters.set(areaId,adapter);
 }
 function selectArea(areaId,scope){
  if(disposed)throw Error('view_disposed');
  if(!adapters.has(areaId))throw Error('view_area_unavailable');
  if(!opaque(scope?.key)||!opaque(scope?.accountId)||!opaque(scope?.collectionId))throw Error('view_scope_required');
  for(const region of Object.values(regions))release(region);
  context=Object.freeze({areaId,key:scope.key,accountId:scope.accountId,collectionId:scope.collectionId,
   workspaceId:opaque(scope.workspaceId)?scope.workspaceId:null,itemId:null,revision:++revision});
  publish('content','empty');return run('navigation');
 }
 function selectItem(itemId){
  if(disposed||!context)return Promise.resolve(false);
  if(!opaque(itemId))throw Error('view_item_required');
  // Preserve independent navigation; reject only content from the prior item.
  context=Object.freeze({...context,itemId});
  // A navigation request is bound to its account/collection revision, not item selection.
  return run('content');
 }
 function suspend(){
  if(disposed)return;context=null;
  for(const [name,region]of Object.entries(regions)){release(region);publish(name,'empty');}
 }
 function dispose(){
  if(disposed)return;suspend();disposed=true;adapters.clear();
  for(const region of Object.values(regions)){
   region.status.remove();region.retry.remove();region.body.remove();region.mount.removeAttribute('aria-busy');
  }
 }
 return {register,selectArea,selectItem,suspend,dispose,retry(name){
  if(!Object.hasOwn(regions,name))throw Error('view_region_invalid');return run(name);
 },get context(){return context;}};
}
