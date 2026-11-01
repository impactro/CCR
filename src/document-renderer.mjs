import {decodeRichDocument} from './rich-document.mjs';
import {createDataTable} from './data.js';
import {createDataChart} from './chart.js';
import {createHeatmap,createGeoMap} from './visuals.mjs';
import {createHtmlFrame} from './sandbox.js';
import {createScope} from './lifecycle.js';
export {decodeRichDocument,RICH_DOCUMENT_VERSION,RICH_DOCUMENT_MAX_BYTES,RICH_DOCUMENT_VIEWS} from './rich-document.mjs';

export function richDocumentText(input,{document=globalThis.document,locale='pt-BR'}={}){
 const decoded=decodeRichDocument(input);if(decoded.status!=='ready'||!document)return '';
 const value=decoded.document;
 if(value.type==='data'){
  const table=createDataTable(document,{...value.data,title:value.title},{locale});
  return [value.title,...[...table.querySelectorAll('tr')].map(row=>[...row.children].map(cell=>cell.textContent).join('\t'))].join('\n');
 }
 const template=document.createElement('template');template.innerHTML=value.data.html;
 template.content.querySelectorAll('script,style,iframe,object,embed,meta,link,base,svg,math').forEach(node=>node.remove());
 template.content.querySelectorAll('p,div,h1,h2,h3,li,tr,br').forEach(node=>node.append(document.createTextNode('\n')));
 return template.content.textContent.trim();
}

/** Small standalone entry: no Markdown engine, resource fetching or host actions. */
export function createDocumentRenderer({locale='pt-BR'}={}){
 const mounts=new WeakMap();
 const dispose=element=>{mounts.get(element)?.handle.dispose();mounts.delete(element);};
 return {dispose,
  update(element,input){
   const decoded=decodeRichDocument(input),key=JSON.stringify(decoded),old=mounts.get(element);
   if(old?.key===key&&!old.handle.signal.aborted)return old.handle;
   dispose(element);const scope=createScope(),document=element.ownerDocument;
   let result=decoded,content;
   if(decoded.status==='ready'){
    try{
     const value=decoded.document;
     const data={...value.data,title:value.title};
     content=value.type==='html'?createHtmlFrame(document,value.data.html,{scripts:false,title:value.title}):value.view==='table'?createDataTable(document,data,{locale}):value.view==='map'?createGeoMap(document,data,{locale}):value.view==='heatmap'?createHeatmap(document,data,{locale}):createDataChart(document,data,{view:value.view,locale});
     if(value.type==='html')scope.cleanup(()=>{content.removeAttribute('srcdoc');content.removeAttribute('src');});
     if(typeof content.dispose==='function')scope.cleanup(()=>content.dispose());
    }catch{result={status:'invalid',code:'render_failed'};}
   }
   if(result.status!=='ready'){content=document.createElement('p');content.className='chat-render-error';content.setAttribute('role','status');content.textContent='Prévia indisponível. O arquivo original continua disponível.';}
   element.classList.add('chat-rich-document');element.replaceChildren(content);
   const handle={result,signal:scope.signal,dispose:()=>scope.dispose()};mounts.set(element,{key,handle});return handle;
  }
 };
}
