// Local verification only: no product API, model, profile or production data.
import http from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {build} from 'esbuild';
const root=new URL('../',import.meta.url),fixtures=new URL('.agents/fixtures/',root);
await mkdir(fixtures,{recursive:true});
const bundle=await build({entryPoints:[new URL('examples/demo.js',root).pathname.replace(/^\/(.:)/,'$1')],bundle:true,write:false,format:'esm',external:['/pdf-runtime.js']});
const pdfBundle=await build({entryPoints:[new URL('src/pdf-runtime.js',root).pathname.replace(/^\/(.:)/,'$1')],bundle:true,write:false,format:'esm',minify:true});
const css=await readFile(new URL('src/styles.css',root),'utf8');
const frame='<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><script defer src="/sandbox-host.js"></script><style>html,body,iframe{margin:0;width:100%;height:100%;border:0}</style></head><body><iframe id="app" title="Conteúdo isolado" sandbox="allow-scripts" data-content-url="/rich-content.html"></iframe></body></html>';
const content='<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><script defer src="/sandbox.js"></script></head><body><main id="content"></main></body></html>';
const page='<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>CChatRender · validação local</title><link rel="stylesheet" href="/demo.css"><script type="module" src="/demo.js"></script></head><body><header><span>CM / CChatRender</span><h1>Uma resposta, vários formatos.</h1><p>Verificação local · valores e mídia sintéticos · sem acesso a dados de atendimento</p></header><main></main><footer><button id="dispose">Liberar recurso de teste</button></footer></body></html>';
const policy="default-src 'none'; script-src 'self'; worker-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self'; frame-src 'self' https://www.youtube-nocookie.com; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'";
const framePolicy="default-src 'none'; script-src 'self' 'unsafe-eval'; style-src 'unsafe-inline'; img-src data:; media-src data:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; sandbox allow-scripts";
const svg='<svg xmlns="http://www.w3.org/2000/svg" width="600" height="240"><rect width="600" height="240" fill="#e6f2eb"/><circle cx="150" cy="120" r="65" fill="#168657"/><path d="M270 175L330 65L390 175Z" fill="#ddae54"/><text x="420" y="125" font-size="22" fill="#18352c">Mídia local</text></svg>';
const stream='BT /F1 22 Tf 50 740 Td (CChatRender - PDF fixture) Tj ET';
const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
let pdf='%PDF-1.4\n',offsets=[0];for(const [i,body]of objects.entries()){offsets.push(Buffer.byteLength(pdf));pdf+=`${i+1} 0 obj\n${body}\nendobj\n`;}
const xref=Buffer.byteLength(pdf);pdf+=`xref\n0 6\n0000000000 65535 f \n`+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
await writeFile(new URL('sample.pdf',fixtures),pdf);
const routes=new Map([['/',[page,'text/html']],['/demo.js',[bundle.outputFiles[0].text,'text/javascript']],['/demo.css',[css+'\nbody{margin:0;background:#f3f6f4;color:#18352c;font:16px system-ui}header,main,footer{max-width:960px;margin:30px auto;padding:0 22px}header span{letter-spacing:.16em;font-size:13px}h1{font-size:42px;margin-bottom:12px}article{background:white;padding:22px;margin:20px 0;border:1px solid #d8e3dc;border-radius:16px}h2{font-size:20px}button{cursor:pointer}iframe{width:100%;min-height:300px;border:1px solid #d8e3dc}figure{margin:20px 0}img,video{max-height:250px;max-width:100%}audio{width:100%}','text/css']],['/rich-app.html',[frame,'text/html']],['/sandbox.js',[await readFile(new URL('src/sandbox-runtime.js',root)),'text/javascript']],['/fixtures/sample.svg',[svg,'image/svg+xml']],['/fixtures/sample.pdf',[Buffer.from(pdf),'application/pdf']]]);
const server=http.createServer(async(req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname;let asset=routes.get(path);
 if(['/fixtures/tone.wav','/fixtures/test.mp4'].includes(path))try{asset=[await readFile(new URL(path.split('/').at(-1),fixtures)),path.endsWith('mp4')?'video/mp4':'audio/wav'];}catch{}
 res.setHeader('Content-Security-Policy',path==='/rich-content.html'?framePolicy:path==='/rich-app.html'?framePolicy.replace("'self' 'unsafe-eval'","'self'").replace("frame-src 'none'","frame-src 'self'"):policy);res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','no-store');
 if(!asset){res.writeHead(404);res.end('Fixture indisponível');return;}
 res.writeHead(200,{'Content-Type':asset[1]});res.end(asset[0]);
});
routes.set('/pdf-runtime.js',[pdfBundle.outputFiles[0].text,'text/javascript']);
routes.set('/rich-content.html',[content,'text/html']);
routes.set('/sandbox-host.js',[await readFile(new URL('src/sandbox-host.js',root)),'text/javascript']);
routes.set('/pdf-worker.mjs',[await readFile(new URL('../build/pdf.worker.mjs',import.meta.resolve('pdfjs-dist'))),'text/javascript']);
server.listen(4271,'127.0.0.1',()=>console.log('CChatRender preview http://127.0.0.1:4271'));
