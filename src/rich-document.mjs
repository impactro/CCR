import {validateTable} from './data-value.mjs';

export const RICH_DOCUMENT_VERSION=1;
export const RICH_DOCUMENT_MAX_BYTES=1024*1024;
export const RICH_DOCUMENT_VIEWS=Object.freeze(['table','bar','column','line','area','map','heatmap']);
const HEADER='<!-- CES-CCR ';
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const keys=(value,allowed)=>object(value)&&Object.keys(value).every(key=>allowed.includes(key));
const failed=code=>({status:'invalid',code});
function boundedTree(value){
 const stack=[[value,0]],seen=new Set();let count=0;
 while(stack.length){
  const [item,depth]=stack.pop();if(++count>25000||depth>16)throw Error('document_limit');
  if(typeof item==='string'&&item.length>RICH_DOCUMENT_MAX_BYTES)throw Error('document_limit');
  if(item===null||typeof item!=='object'){if(!['string','boolean','number'].includes(typeof item)&&item!==null||typeof item==='number'&&!Number.isFinite(item))throw Error('invalid_value');continue;}
  if(seen.has(item)||!Array.isArray(item)&&Object.getPrototypeOf(item)!==Object.prototype&&Object.getPrototypeOf(item)!==null)throw Error('invalid_value');
  seen.add(item);
  for(const [key,descriptor] of Object.entries(Object.getOwnPropertyDescriptors(item))){
   if(['__proto__','prototype','constructor'].includes(key)||descriptor.get||descriptor.set)throw Error('invalid_value');
   if(key!=='length')stack.push([descriptor.value,depth+1]);
  }
 }
}

/** No I/O. Header is a format marker, never authentication or a script grant. */
export function decodeRichDocument(input){
 try{
  let value=input;
  if(typeof input==='string'){
   if(input.length>RICH_DOCUMENT_MAX_BYTES||new TextEncoder().encode(input).byteLength>RICH_DOCUMENT_MAX_BYTES)return failed('document_limit');
   const source=input.replace(/^\uFEFF/,'').trimStart();
   if(source.startsWith(HEADER)){
    const end=source.indexOf('-->');if(end<0||end>8192)return failed('invalid_header');
    value=JSON.parse(source.slice(HEADER.length,end));
    if(!object(value)||value.type!=='html'||value.data!==undefined)return failed('invalid_header');
    value={...value,data:{html:source.slice(end+3)}};
   }else{
    if(!source.startsWith('{'))return {status:'unrecognized'};
    value=JSON.parse(source);
   }
  }
  if(!object(value))return {status:'unrecognized'};
  boundedTree(value);
  if(value.owner!=='CES'||value.format!=='ccr.document')return {status:'unrecognized'};
  if(new TextEncoder().encode(JSON.stringify(value)).byteLength>RICH_DOCUMENT_MAX_BYTES)return failed('document_limit');
  if(!keys(value,['owner','format','version','renderer','type','view','title','data'])||!keys(value.renderer,['name','version']))return failed('invalid_header');
  if(value.version!==1||value.renderer.name!=='CCR'||value.renderer.version!==1)return {status:'unsupported',code:'unsupported_version'};
  if(typeof value.title!=='string'||!value.title.trim()||value.title.length>180)return failed('invalid_title');
  let data;
  if(value.type==='data'){
   if(!RICH_DOCUMENT_VIEWS.includes(value.view))return {status:'unsupported',code:'unsupported_view'};
   if(!keys(value.data,['columns','rows','source','period','note'])||!Array.isArray(value.data.columns)||!value.data.columns.every(column=>keys(column,['label','type'])))return failed('invalid_data');
   data=validateTable(value.data,{typed:true});
   for(const field of ['source','period','note'])if(value.data[field]!==undefined){if(typeof value.data[field]!=='string'||value.data[field].length>800)return failed('invalid_data');data[field]=value.data[field];}
  }else if(value.type==='html'){
   if(value.view!==undefined||!keys(value.data,['html'])||typeof value.data.html!=='string'||value.data.html.length>120000)return failed('invalid_html');
   data={html:value.data.html};
  }else return {status:'unsupported',code:'unsupported_type'};
  return {status:'ready',document:{owner:'CES',format:'ccr.document',version:1,renderer:{name:'CCR',version:1},type:value.type,...(value.view?{view:value.view}:{}),title:value.title,data}};
 }catch(error){return failed(error instanceof SyntaxError?'invalid_json':error?.message==='document_limit'?'document_limit':'invalid_document');}
}
