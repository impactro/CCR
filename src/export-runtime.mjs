import {documentPages} from './document-scene.mjs';
// Closed stdin protocol. No filesystem, network, plugins, HTML or evaluation.
let source='';
try{
 for await(const chunk of process.stdin){source+=chunk;if(Buffer.byteLength(source)>32_000_000)throw Error('runtime_input_limit');}
 const input=JSON.parse(source),resources=input.resources||{};
 const pages=documentPages(input.document,{resolveResource:id=>Object.hasOwn(resources,id)?resources[id]:null});
 const result=JSON.stringify({pages});if(Buffer.byteLength(result)>64_000_000)throw Error('runtime_output_limit');
 process.stdout.write(result);
}catch(error){process.stderr.write(String(error.message));process.exitCode=1;}
