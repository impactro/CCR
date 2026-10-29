// Native browser PDF: no worker, canvas renderer or eager document fetch.
export function createPdfPreview(document,url,context){
 const root=document.createElement('section'),button=document.createElement('button');
 root.className='chat-pdf';button.type='button';button.className='chat-file-preview';button.textContent='Visualizar PDF';
 root.append(button);let viewer=null,documentNode=null;
 const dispose=()=>{documentNode?.removeAttribute('data');viewer?.remove();viewer=null;documentNode=null;};
 context.cleanup(dispose);
 button.addEventListener('click',()=>{
  if(context.signal?.aborted||viewer)return;
  viewer=document.createElement('section');viewer.className='chat-file-viewer';viewer.setAttribute('role','region');viewer.setAttribute('aria-label','Visualizador de PDF');
  const toolbar=document.createElement('header'),download=document.createElement('a'),close=document.createElement('button'),pdf=document.createElement('object');
  toolbar.className='chat-file-toolbar';download.href=url;download.download='';download.textContent='Baixar';close.type='button';close.textContent='Fechar';
  documentNode=pdf;pdf.className='chat-file-document';pdf.type='application/pdf';pdf.data=url+'#toolbar=0&navpanes=0';pdf.setAttribute('aria-label','Documento PDF');
  const fallback=document.createElement('p');fallback.textContent='Use Baixar para abrir o PDF no seu computador.';pdf.append(fallback);
  close.onclick=()=>{dispose();button.focus();};viewer.addEventListener('keydown',event=>{if(event.key==='Escape'){event.stopPropagation();close.click();}});toolbar.append(download,close);viewer.append(toolbar,pdf);
  (context.viewerContainer||root).append(viewer);close.focus();
 });return root;
}
