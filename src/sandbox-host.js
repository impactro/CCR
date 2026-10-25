// Trusted outer frame. Supplied HTML is only forwarded to the opaque child.
let payload=null,ready=false,sent=false;
const frame=document.querySelector('#app');
const send=()=>{if(ready&&payload&&!sent){sent=true;frame.contentWindow.postMessage(payload,'*');}};
frame.addEventListener('load',()=>{ready=true;send();});
const contentUrl=new URL(frame.dataset.contentUrl||'/rich-content.html',document.baseURI);
if(contentUrl.origin!==new URL(document.baseURI).origin||contentUrl.search||contentUrl.hash)throw Error('Conteúdo isolado inválido');
frame.src=contentUrl.href;
window.addEventListener('message',event=>{
 if(payload||event.source!==parent||event.data?.type!=='crania:render-html')return;
 if(typeof event.data.html!=='string'||event.data.html.length>120000||typeof event.data.scripts!=='boolean')return;
 payload={type:'crania:render-html',html:event.data.html,scripts:event.data.scripts};send();
});
