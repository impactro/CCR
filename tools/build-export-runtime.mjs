import {build,version} from 'esbuild';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url)),dest=path.join(root,'python/ccr/runtime');
const hash=b=>createHash('sha256').update(b).digest('hex');
if(version!=='0.28.2')throw Error('export_builder_version_mismatch');
const result=await build({absWorkingDir:root,entryPoints:['src/export-runtime.mjs'],bundle:true,write:false,platform:'node',format:'esm',target:'node22',charset:'utf8',legalComments:'none',metafile:true});
const bytes=result.outputFiles[0].contents,sources={};
for(const name of Object.keys(result.metafile.inputs).sort())sources[name]=hash((await readFile(path.join(root,name),'utf8')).replace(/\r\n/g,'\n'));
const pkg=JSON.parse(await readFile(path.join(root,'package.json'),'utf8'));
const manifest=JSON.stringify({version:pkg.cesVersion,builder:'esbuild@0.28.2',sources,runtimeSha256:hash(bytes)},null,2)+'\n';
if(process.argv.includes('--check')){
 if(!Buffer.from(bytes).equals(await readFile(path.join(dest,'export.mjs')))||manifest!==await readFile(path.join(dest,'provenance.json'),'utf8'))throw Error('stale_export_runtime: run node tools/build-export-runtime.mjs');
 console.log('export runtime provenance OK');
}else{await mkdir(dest,{recursive:true});await writeFile(path.join(dest,'export.mjs'),bytes);await writeFile(path.join(dest,'provenance.json'),manifest);}
