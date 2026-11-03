import {decodeRichDocument} from './rich-document.mjs';
import {createDataTable} from './data.js';
import {createDataChart} from './chart.js';
import {createHeatmap,createGeoMap} from './visuals.mjs';
import {createHtmlFrame} from './sandbox.js';
import {createScope} from './lifecycle.js';
import {documentPages} from './document-scene.mjs';
export {documentPages,PAGE_WIDTH,PAGE_HEIGHT,MAX_PAGES} from './document-scene.mjs';
export {decodeRichDocument,RICH_DOCUMENT_VERSION,RICH_DOCUMENT_MAX_BYTES,RICH_DOCUMENT_VIEWS} from './rich-document.mjs';

export function richDocumentText(input,{document=globalThis.document,locale='pt-BR'}={}){
 const decoded=decodeRichDocument(input);if(decoded.status!=='ready'||!document)return '';
 const value=decoded.document;
 if(value.type==='text')return value.title+'\n'+value.data.text;
 if(value.type==='image')return value.title+'\n'+value.data.alt;
 if(value.type==='report')return value.title+'\n'+value.data.sections.map(section=>richDocumentText(section,{document,locale})).join('\n\n');
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
export function createDocumentRenderer({locale='pt-BR',resolveResource,renderData}={}){
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
     if(['text','image','report'].includes(value.type)){
      content=document.createElement('section');content.className='chat-document-pages';content.setAttribute('aria-label',value.title);
      for(const svg of documentPages(value,{resolveResource})){const template=document.createElement('template');template.innerHTML=svg;content.append(template.content);}
      if(value.type==='report'){
       const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Dados acessíveis';details.append(summary);
       for(const section of value.data.sections)if(section.type==='data')details.append(createDataTable(document,{...section.data,title:section.title},{locale}));content.append(details);
      }
      const images=[...content.querySelectorAll('image')];scope.cleanup(()=>images.forEach(image=>{image.removeAttribute('href');image.removeAttribute('xlink:href');}));
     }else if(value.type==='data'&&typeof renderData==='function'&&!['map','heatmap'].includes(value.view)){
       const rendered=renderData(document,data,value.view);content=rendered?.element||rendered;
       if(typeof rendered?.dispose==='function')scope.cleanup(()=>rendered.dispose());
     }else content=value.type==='html'?createHtmlFrame(document,value.data.html,{scripts:false,title:value.title}):value.view==='table'?createDataTable(document,data,{locale}):value.view==='map'?createGeoMap(document,data,{locale}):value.view==='heatmap'?createHeatmap(document,data,{locale}):createDataChart(document,data,{view:value.view,locale});
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
