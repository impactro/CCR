import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {buildRenderPrompt,getRenderPromptContract,validateRenderPromptPlugin,RENDER_PROMPT_VERSION,RENDER_PROMPT_SCHEMA_VERSION,MAX_RENDER_PROMPT_PLUGINS} from '@crania/chat-render/prompt';
import {decodeRichDocument,RICH_DOCUMENT_VIEWS} from '../../src/rich-document.mjs';
import {createChatRenderer} from '../../src/renderer.js';

const plugin=()=>({id:'example.summary',version:'1.0.0',fence:'summary',schema:{type:'object',properties:{title:{type:'string'}},required:['title'],additionalProperties:false},instructions:['Use a supplied title.'],examples:[{content:{title:'Synthetic example'}}]});

test('package, release, prompt and its exported files have matching versions',async()=>{
  const contract=getRenderPromptContract(),pkg=JSON.parse(await readFile(new URL('../../package.json',import.meta.url))),release=JSON.parse(await readFile(new URL('../../release.json',import.meta.url)));
  assert.equal(contract.version,pkg.cesVersion);assert.equal(RENDER_PROMPT_VERSION,release.promptVersion);
  assert.equal(contract.packageVersion,pkg.version);assert.equal(RENDER_PROMPT_SCHEMA_VERSION,1);assert.equal(release.promptSchemaVersion,1);
  const raw=JSON.parse(await readFile(new URL('../../config/prompts/render.prompt.json',import.meta.url),'utf8'));
  assert.deepEqual(contract,raw);assert.equal(import.meta.resolve('@crania/chat-render/prompt.json'),new URL('../../config/prompts/render.prompt.json',import.meta.url).href);
  assert.match(await readFile(new URL('../../config/prompts/render.prompt.md',import.meta.url),'utf8'),/render\.prompt\.json/);
  contract.instructions.length=0;contract.capabilities[0].instructions.length=0;
  assert.ok(getRenderPromptContract().instructions.length);assert.ok(getRenderPromptContract().capabilities[0].instructions.length);
});

test('default prompt advertises Markdown only and never silently enables formats/plugins',()=>{
  const text=buildRenderPrompt();assert.match(text,/Available capabilities: Markdown only/);
  assert.doesNotMatch(text,/## (?:data|spa|Host plugin)/);assert.doesNotMatch(text,/```(?:ccr|chart|html|spa)/);
  const one=buildRenderPrompt({capabilities:['data','chart','data']}),two=buildRenderPrompt({capabilities:['chart','data']});
  assert.equal(one,two);assert.match(one,/```chart/);assert.doesNotMatch(one,/## spa|## map/);
});

test('unknown capabilities, expanded limits and disabled visual budget fail explicitly',()=>{
  for(const options of [{capabilities:['pie']},{capabilities:'data'},{limits:{rows:1001}},{limits:{unknown:1}},{limits:{visuals:-1}},{capabilities:['data'],limits:{visuals:0}},{plugins:[plugin()],limits:{visuals:0}},{unknown:true}])assert.throws(()=>buildRenderPrompt(options),TypeError);
  const text=buildRenderPrompt({capabilities:['chart'],limits:{rows:4,visuals:1}});
  assert.match(text,/"chartRows":4/);assert.match(text,/"mapPoints":4/);assert.match(text,/"visuals":1/);
});

test('canonical rich examples are accepted by the actual decoder and renderer, not just JSON shape',()=>{
  const dom=new JSDOM('<main></main>',{url:'https://host.test/'}),root=dom.window.document.querySelector('main'),issues=[];
  const renderer=createChatRenderer({onIssue:code=>issues.push(code)}),contract=getRenderPromptContract();
  for(const capability of contract.capabilities)for(const sample of capability.examples){
    if(sample.fence==='ccr')assert.equal(decodeRichDocument(sample.content).status,'ready',capability.id);
    const source=typeof sample.content==='string'?sample.content:JSON.stringify(sample.content);
    renderer.render(root,{text:'```'+sample.fence+'\n'+source+'\n```'});
    assert.equal(root.querySelector('.chat-render-error'),null,capability.id);assert.deepEqual(issues,[],capability.id);
    if(capability.id==='chart')assert.ok(root.querySelector('svg'),capability.id);
    if(capability.id==='map'){assert.ok(root.querySelector('path[data-uf],path[data-country]'));assert.equal(root.querySelectorAll('tbody tr').length,sample.content.rows.length);}
    if(['html','spa','ccr.html'].includes(capability.id))assert.ok(root.querySelector('iframe'));
    renderer.dispose(root);
  }
  const data=contract.capabilities.find(c=>c.id==='ccr.data').examples[0].content;
  for(const view of RICH_DOCUMENT_VIEWS)assert.equal(decodeRichDocument({...data,view}).status,'ready',view);
  dom.window.close();
});

test('trusted plugin schema, version and fixtures enter context only when explicitly supplied',()=>{
  const descriptor=plugin(),copy=validateRenderPromptPlugin(descriptor);assert.deepEqual(copy,descriptor);assert.notEqual(copy,descriptor);
  const text=buildRenderPrompt({plugins:[descriptor]});assert.match(text,/Host plugin example\.summary@1\.0\.0/);assert.match(text,/"required"/);assert.match(text,/```summary/);
  assert.doesNotMatch(buildRenderPrompt(),/example\.summary|```summary/);
  const dom=new JSDOM('<main></main>'),root=dom.window.document.querySelector('main');let calls=0;
  const renderer=createChatRenderer({plugins:{summary(source,{document}){const value=JSON.parse(source);assert.equal(typeof value.title,'string');calls++;const node=document.createElement('p');node.textContent=value.title;return node;}}});
  renderer.render(root,{text:'```summary\n'+JSON.stringify(descriptor.examples[0].content)+'\n```'});
  assert.equal(calls,1);assert.equal(root.textContent.trim(),'Synthetic example');renderer.dispose(root);dom.window.close();
});

test('overrides cannot advertise both a core format and a different plugin schema for the same fence',()=>{
  const override={...plugin(),fence:'chart'};
  assert.throws(()=>buildRenderPrompt({capabilities:['chart'],plugins:[override]}),/prompt_plugin_conflict/);
  assert.match(buildRenderPrompt({capabilities:['data'],plugins:[override]}),/Host plugin/);
  assert.throws(()=>buildRenderPrompt({plugins:[plugin(),plugin()]}),/prompt_plugin_conflict/);
  const other={...plugin(),id:'example.other'};assert.throws(()=>buildRenderPrompt({plugins:[plugin(),other]}),/prompt_plugin_conflict/);
  assert.match(buildRenderPrompt({capabilities:['ccr.data','ccr.html']}),/## ccr\.html/);
});

test('malformed, remote-reference, cyclic or executable descriptors are refused without executing accessors',()=>{
  for(const change of [{version:'main'},{schema:{$ref:'https://unknown.test/schema'}},{schema:{type:'object',properties:{x:{$ref:'#/$defs/x'}}}},{instructions:[]},{examples:[]},{fence:'bad\n```'},{enabled:true}])assert.throws(()=>validateRenderPromptPlugin({...plugin(),...change}),TypeError);
  const cycle=plugin();cycle.schema.self=cycle;assert.throws(()=>validateRenderPromptPlugin(cycle),TypeError);
  let invoked=false;const getter=plugin();Object.defineProperty(getter,'schema',{get(){invoked=true;return {};}});assert.throws(()=>validateRenderPromptPlugin(getter));assert.equal(invoked,false);
  const tooLarge=plugin();tooLarge.schema.description='x'.repeat(33000);assert.throws(()=>validateRenderPromptPlugin(tooLarge),/prompt_descriptor_limit/);
});

test('the full ALP-sized registry fits without dropping plugins, while aggregate prompt size stays bounded',()=>{
  assert.equal(MAX_RENDER_PROMPT_PLUGINS,32);
  const plugins=Array.from({length:MAX_RENDER_PROMPT_PLUGINS},(_,i)=>({...plugin(),id:`example.plugin${i}`,fence:`plugin-${i}`}));
  const text=buildRenderPrompt({plugins});assert.equal((text.match(/## Host plugin /g)||[]).length,32);
  assert.throws(()=>buildRenderPrompt({plugins:[...plugins,{...plugin(),id:'example.extra',fence:'extra'}]}),/prompt_capabilities_invalid/);
  const large=plugins.slice(0,5).map(p=>({...p,instructions:Array.from({length:8},()=> 'x'.repeat(1800))}));
  assert.throws(()=>buildRenderPrompt({plugins:large}),/prompt_output_limit/);
});


test('city quantity prompt resolves names, preserves zero and reports unmapped coverage',()=>{
 const example=getRenderPromptContract().capabilities.find(c=>c.id==='map').examples[1].content;
 const dom=new JSDOM('<main></main>'),root=dom.window.document.querySelector('main');
 const renderer=createChatRenderer();renderer.render(root,{text:'```map\n'+JSON.stringify(example)+'\n```'});
 assert.equal(root.querySelectorAll('circle').length,2);assert.equal(root.querySelectorAll('tbody tr').length,3);
 assert.match(root.textContent,/Cidade não identificada/);assert.match(root.textContent,/2 de 3/);
 const text=buildRenderPrompt({capabilities:['map']});assert.match(text,/city-level/);assert.match(text,/GPS is optional/);assert.match(text,/coverage/);
 renderer.dispose(root);dom.window.close();
});
