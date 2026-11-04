const MIMES=Object.freeze({
 image:['image/jpeg','image/png','image/webp','image/gif','image/avif','image/bmp'],
 video:['video/mp4','video/webm','video/ogg'],
 audio:['audio/ogg','audio/mpeg','audio/mp4','audio/wav','audio/x-wav','audio/webm','audio/aac','audio/flac','audio/x-m4a'],
 pdf:['application/pdf']
});
const EXTENSIONS=Object.freeze({pdf:'application/pdf',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif',avif:'image/avif',bmp:'image/bmp',mp4:'video/mp4',webm:'video/webm',ogv:'video/ogg',ogg:'audio/ogg',opus:'audio/ogg',mp3:'audio/mpeg',m4a:'audio/mp4',wav:'audio/wav',aac:'audio/aac',flac:'audio/flac'});
const DEFAULTS={image:'image/jpeg',sticker:'image/webp',audio:'audio/ogg',voice:'audio/ogg',video:'video/mp4',pdf:'application/pdf'};

/** MIME supplied by the host takes precedence over filename or presentation hints. */
export function mediaType(item,{kinds=['image','video','audio','pdf']}={}){
 if(!item||typeof item!=='object'||Array.isArray(item))return null;
 let mime=String(item.mimeType||'').split(';')[0].trim().toLowerCase();
 if(!mime||mime==='application/octet-stream'){
  const extension=/\.([a-z0-9]+)$/i.exec(String(item.filename||''))?.[1]?.toLowerCase();
  mime=EXTENSIONS[extension]||DEFAULTS[String(item.type||item.kind||'').toLowerCase()]||'';
 }
 const kind=Object.keys(MIMES).find(key=>MIMES[key].includes(mime));
 return kind&&kinds.includes(kind)?{kind,mime}:null;
}

/** Existing CCR resource contract. A URL is never authority by itself. */
export function resourceUrl(value,{baseUrl,resourceOrigins=[],allowResource}={}){
 if(typeof value!=='string'||value.length>2048)throw Error('Recurso inválido');
 const base=new URL(baseUrl),url=new URL(value,base);
 if(url.protocol==='blob:'){
  if(url.origin!==base.origin||typeof allowResource!=='function'||allowResource(url)!==true)throw Error('Blob não autorizado pelo host');
  return url.href;
 }
 if(url.username||url.password||url.hash||!['http:','https:'].includes(url.protocol))throw Error('URL inválida');
 const localArtifact=url.origin===base.origin&&/^\/api\/session\/artifact\/[a-f0-9-]{36}$/.test(url.pathname)&&!url.search;
 const external=url.protocol==='https:'&&resourceOrigins.includes(url.origin);
 const granted=typeof allowResource==='function'&&allowResource(url)===true;
 if(!localArtifact&&!external&&!granted)throw Error('Recurso não autorizado pelo host');
 return url.href;
}

export const escapeMedia=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function mediaAttributes(value={}){
 return Object.entries(value).map(([name,item])=>{
  if(!/^(?:id|title|role|tabindex|data-[a-z0-9-]+|aria-[a-z0-9-]+)$/.test(name))throw Error('Atributo de mídia inválido');
  if(item===null||item===undefined)return '';
  return ` ${name}="${escapeMedia(String(item).slice(0,2048))}"`;
 }).join('');
}
