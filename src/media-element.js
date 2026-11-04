import {mediaType,resourceUrl,escapeMedia as esc,mediaAttributes} from './media-resource.js';

/** Trusted host presentation options; item contains data, never markup or handlers. */
export function renderMediaElement(item,options={}){
 const type=mediaType(item);if(!type)throw Error('Tipo de mídia não suportado');
 const url=options.authorizedUrl===true&&options.ownedBlob===true&&/^blob:/.test(item.url||'')
  ?item.url:resourceUrl(item.url,options);
 const title=String(item.title||item.filename||'Arquivo').slice(0,180);
 const attrs=mediaAttributes(options.attributes),className=esc(['ccr-media-element',options.className||''].filter(Boolean).join(' '));
 let content;
 if(type.kind==='image')content=`<img class="${className}"${attrs} src="${esc(url)}" alt="${esc(title)}" loading="lazy" decoding="async" referrerpolicy="no-referrer">`;
 else if(type.kind==='pdf')content=`<object class="${className}"${attrs} data="${esc(url)}#toolbar=0&amp;navpanes=0" type="application/pdf" aria-label="${esc(title)}"><p>Use Baixar para abrir este PDF no seu computador.</p></object>`;
 else{
  const preload=['none','metadata'].includes(options.preload)?options.preload:'none';
  content=`<${type.kind} class="${className}"${attrs} src="${esc(url)}" controls preload="${preload}"${type.kind==='video'?' playsinline':''} aria-label="${esc(title)}"></${type.kind}>`;
 }
 if(type.kind==='image'&&options.preview){
  content=`<button type="button" class="${esc(['ccr-media-open',options.preview.className||''].join(' '))}" data-ccr-media-action="preview" aria-label="${esc(options.preview.label||'Visualizar imagem')}"${mediaAttributes(options.preview.attributes)}>${content}</button>`;
 }
 return content;
}

export function stopMediaElement(element,{clearSource=true}={}){
 if(['AUDIO','VIDEO'].includes(element.tagName)){
  try{element.pause();}catch{}
  if(clearSource){element.removeAttribute('src');try{element.load();}catch{}}
 }else if(clearSource)element.removeAttribute(element.tagName==='OBJECT'?'data':'src');
}

/** Reconcile live DOM ownership. Unchanged players keep time/rate/listeners. */
export function createMediaBindings({onState,onPreview,signal}={}){
 const mounts=new Map();let disposed=false;
 function release(element,entry){
  for(const [event,listener] of entry.listeners)element.removeEventListener(event,listener);
  stopMediaElement(element,{clearSource:element.getAttribute(entry.attribute)===entry.source});
  mounts.delete(element);
 }
 const bindings={
  sync(root){
   if(disposed)return;
   const elements=new Set(root?.querySelectorAll('.ccr-media-element')||[]);
   for(const [element,entry] of mounts)if(!elements.has(element)||element.getAttribute(entry.attribute)!==entry.source)release(element,entry);
   for(const element of elements){
    if(mounts.has(element))continue;
    const attribute=element.tagName==='OBJECT'?'data':'src',source=element.getAttribute(attribute),listeners=[];
    const listen=(event,fn)=>{element.addEventListener(event,fn);listeners.push([event,fn]);};
    const update=phase=>{element.dataset.ccrMediaPhase=phase;onState?.({element,phase,key:element.dataset.mediaKey||''});};
    for(const event of ['loadeddata','loadedmetadata','load'])listen(event,()=>update('ready'));
    listen('error',()=>update('error'));listen('abort',()=>update('aborted'));
    if(onPreview&&element.tagName==='IMG')listen('click',event=>onPreview({element,event}));
    mounts.set(element,{attribute,source,listeners});
   }
  },
  pause(){for(const element of mounts.keys())if(['AUDIO','VIDEO'].includes(element.tagName))try{element.pause();}catch{}},
  dispose(){if(disposed)return;disposed=true;for(const [element,entry] of [...mounts])release(element,entry);signal?.removeEventListener('abort',bindings.dispose);},
  get size(){return mounts.size;}
 };
 if(signal?.aborted)bindings.dispose();else signal?.addEventListener('abort',bindings.dispose,{once:true});
 return bindings;
}
