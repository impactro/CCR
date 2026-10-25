// PDF.js is supplied lazily by the host, never loaded for an ordinary chat turn.
export function createPdfPreview(document,url,context){
  const root=document.createElement('section'),button=document.createElement('button'),status=document.createElement('p'),canvas=document.createElement('canvas'),previous=document.createElement('button'),next=document.createElement('button');
  const controls=document.createElement('div');controls.className='chat-pdf-controls';
  button.type=previous.type=next.type='button';button.textContent='Pré-visualizar PDF';previous.textContent='Página anterior';next.textContent='Próxima página';
  status.setAttribute('role','status');canvas.hidden=controls.hidden=true;controls.append(previous,status,next);root.append(button,controls,canvas);
  let pdf,task,renderTask,page=1,busy=false,disposed=false;
  const controller=new AbortController();
  const release=()=>{renderTask?.cancel();void task?.destroy().catch(()=>{});canvas.width=canvas.height=0;};
  context.cleanup(()=>{disposed=true;controller.abort();release();});
  const draw=async()=>{
    busy=true;previous.disabled=next.disabled=true;
    try{
      const sheet=await pdf.getPage(page);if(disposed)return;
      const natural=sheet.getViewport({scale:1});const scale=Math.min(1.5,900/natural.width,1400/natural.height);
      const viewport=sheet.getViewport({scale});canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
      canvas.style.maxWidth='100%';canvas.style.height='auto';
      renderTask=sheet.render({canvasContext:canvas.getContext('2d'),viewport});await renderTask.promise;
      if(!disposed){status.textContent=`Página ${page} de ${pdf.numPages}`;canvas.setAttribute('role','img');canvas.setAttribute('aria-label',`Página ${page} do documento PDF`);canvas.hidden=false;}
    }finally{busy=false;previous.disabled=page<=1;next.disabled=page>=pdf.numPages;}
  };
  const failed=()=>{if(!disposed){status.textContent='Não foi possível preparar a prévia. Use Abrir PDF.';context.onIssue?.('render_error');}};
  button.addEventListener('click',async()=>{
    if(busy||disposed)return;busy=true;button.disabled=true;controls.hidden=false;status.textContent='Carregando PDF…';
    try{
      const worker=new URL(context.options.pdfWorkerUrl,document.baseURI);
      if(worker.origin!==new URL(document.baseURI).origin||worker.search||worker.hash)throw Error('Worker inválido');
      const library=await context.options.pdfLoader();if(disposed)return;
      library.GlobalWorkerOptions.workerSrc=worker.href;
      const response=await document.defaultView.fetch(url,{signal:controller.signal,credentials:'same-origin'});
      if(!response.ok||!/^application\/pdf(?:;|$)/i.test(response.headers.get('content-type')||''))throw Error('PDF inválido');
      const max=30*1024*1024;
      if(Number(response.headers.get('content-length'))>max){await response.body?.cancel();throw Error('PDF acima do limite');}
      const reader=response.body.getReader(),chunks=[];let size=0;
      while(true){const item=await reader.read();if(item.done)break;size+=item.value.byteLength;if(size>max){await reader.cancel();throw Error('PDF acima do limite');}chunks.push(item.value);}
      const data=new Uint8Array(size);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.byteLength;}
      if(disposed)return;
      task=library.getDocument({data,isEvalSupported:false,useSystemFonts:true,disableFontFace:true,enableXfa:false,useWorkerFetch:false,useWasm:false,maxImageSize:16_000_000});pdf=await task.promise;
      if(disposed)return;
      if(pdf.numPages>1000)throw Error('PDF acima do limite');
      button.hidden=true;await draw();
    }catch{release();failed();}finally{busy=false;}
  });
  previous.addEventListener('click',()=>{if(!busy&&!disposed&&page>1){page--;void draw().catch(failed);}});
  next.addEventListener('click',()=>{if(!busy&&!disposed&&pdf&&page<pdf.numPages){page++;void draw().catch(failed);}});
  return root;
}
