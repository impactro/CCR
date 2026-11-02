import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {geographicBase,worldBase,resolvePlace,mapLocations} from '../../src/geography.mjs';
import {createGeoMap} from '../../src/visuals.mjs';
import {createChatRenderer} from '../../src/renderer.js';
import {createDocumentRenderer} from '../../src/document-renderer.mjs';

test('bundled public geography has27 geometries and5570 unique seats with provenance',()=>{
 assert.equal(geographicBase.states.length,27);assert.equal(geographicBase.cities.length,5570);
 assert.equal(new Set(geographicBase.cities.map(c=>c[4])).size,5570);
 assert.ok(geographicBase.sources.every(s=>s.url.startsWith('https://')&&/^[a-f0-9]{64}$/.test(s.sha256)));
 for(const c of geographicBase.cities){assert.ok(Math.abs(c[2])<=90);assert.ok(Math.abs(c[3])<=180);}
});
test('names resolve offline with accent/case normalization and explicit ambiguity',()=>{
 const recife=resolvePlace('RECIFE',{state:'pernambuco'});assert.equal(recife.status,'ready');assert.equal(recife.state.uf,'PE');assert.ok(recife.latitude<-8&&recife.latitude>-9);
 assert.equal(resolvePlace('arUJá/SP').status,'ready');assert.equal(resolvePlace('São Paulo',{kind:'state'}).state.uf,'SP');
 assert.equal(resolvePlace('Brasília/DF').status,'ready');assert.equal(resolvePlace('Bom Jesus').status,'ambiguous-city');
 assert.equal(resolvePlace('Bom Jesus',{state:'PI'}).status,'ready');assert.equal(resolvePlace('Arujá/SP',{state:'BA'}).status,'conflicting-state');
 assert.equal(resolvePlace('Arujá',{state:'XX'}).status,'unknown-state');assert.equal(resolvePlace('inexistente').status,'unknown-city');
 assert.equal(resolvePlace('',{}).status,'missing');assert.equal(resolvePlace('XX',{kind:'state'}).status,'unknown-state');
});
test('explicit invalid GPS is never replaced silently by a plausible city; null GPS may use a seat',()=>{
 const r=mapLocations({columns:['Cidade','UF','Latitude','Longitude','Quantidade'],rows:[['Recife','PE',-8.05,-34.9,0],['Recife','PE',100,-34.9,2],['Recife','PE',null,null,null],['Recife','PE',-8,null,1]]});
 assert.deepEqual(r.locations.map(p=>p.status),['ready','invalid-coordinates','ready','invalid-coordinates']);
 assert.equal(r.locations[0].kind,'coordinate');assert.equal(r.locations[0].metric,0);assert.equal(r.locations[2].kind,'city');
});
test('city-only table creates real boundaries, proportional points, zero and null, with bounded UI and disposal',()=>{
 const dom=new JSDOM(),d=dom.window.document;
 const node=createGeoMap(d,{columns:['Cidade','UF','Quantidade'],rows:[['Recife','PE',12],['Arujá','SP',0],['Salvador','BA',null],['Bom Jesus',null,2],['Desconhecida','SP',4]]});
 assert.equal(node.querySelectorAll('path[data-uf]').length,27);assert.equal(node.querySelectorAll('circle').length,3);assert.equal(node.querySelectorAll('tbody tr').length,5);
 const dots=node.querySelectorAll('circle');assert.ok(+dots[0].getAttribute('r')>+dots[1].getAttribute('r'));
 assert.match(node.querySelector('.chat-geographic-summary').textContent,/3 de 5/);assert.match(node.textContent,/homônima/);
 node.querySelector('[data-row="1"]').dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Enter'}));assert.match(node.querySelector('[role=status]').textContent,/Quantidade: 0/);
 node.querySelector('[data-row="2"]').dispatchEvent(new dom.window.Event('click'));assert.match(node.querySelector('[role=status]').textContent,/Sem dado/);
 const canvas=node.querySelector('svg'),view=canvas.querySelector('g'),before=view.getAttribute('transform'),zoom=node.querySelector('[aria-label="Ampliar mapa"]');zoom.click();assert.notEqual(view.getAttribute('transform'),before);
 const zoomed=view.getAttribute('transform');canvas.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'ArrowLeft'}));assert.notEqual(view.getAttribute('transform'),zoomed);
 canvas.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Home'}));const reset=view.getAttribute('transform');assert.match(reset,/scale\(1\)/);
 node.dispose();node.dispose();zoom.click();assert.equal(view.getAttribute('transform'),reset);dom.window.close();
});
test('countries, English/Portuguese names and continents resolve without guessing foreign cities',()=>{
 assert.equal(worldBase.countries.length,242);
 for(const value of ['França','France','FR','FRA'])assert.equal(resolvePlace(value,{kind:'country'}).country.code,'FRA');
 assert.equal(resolvePlace('Europa',{kind:'continent'}).kind,'continent');
 assert.equal(resolvePlace('Atlantis',{kind:'country'}).status,'unknown-country');assert.equal(resolvePlace('America',{kind:'continent'}).status,'unknown-continent');
 assert.equal(mapLocations({columns:['Cidade','País'],rows:[['São Paulo','França']]}).locations[0].status,'unsupported-city-country');
 assert.equal(mapLocations({columns:['Cliente','País','Quantidade'],rows:[['Cliente Alfa','França',2]]}).locations[0].country.code,'FRA');
 assert.equal(mapLocations({columns:['Descrição','Estado','Quantidade'],rows:[['Cadastro','Goiás',2]]}).locations[0].state.uf,'GO');
});
test('world choropleth uses real country shapes and colors zero separately from unknown; duplicate rows are not summed',()=>{
 const dom=new JSDOM(),node=createGeoMap(dom.window.document,{columns:['País','Clientes'],rows:[['França',800],['Alemanha',400],['Brasil',0],['Portugal',null],['Itália',3],['Itália',4]]});
 assert.equal(node.querySelectorAll('path[data-country]').length,242);assert.equal(node.querySelectorAll('circle').length,0);
 const get=code=>node.querySelector(`[data-country="${code}"]`);
 assert.notEqual(get('FRA').getAttribute('fill'),get('DEU').getAttribute('fill'));assert.notEqual(get('BRA').getAttribute('fill'),get('PRT').getAttribute('fill'));
 get('ITA').dispatchEvent(new dom.window.Event('click'));assert.match(node.querySelector('[role=status]').textContent,/Clientes: 3.*Clientes: 4/);assert.match(node.textContent,/múltiplas linhas/);
 assert.match(node.querySelector('svg g').getAttribute('transform'),/scale\(/);node.dispose();dom.window.close();
});
test('a single Brazilian state fits its actual region and a continent colors its country members',()=>{
 const dom=new JSDOM(),node=createGeoMap(dom.window.document,{columns:['Cidade','UF','Clientes'],rows:[['Limeira','SP',8],['Santo André','SP',4]]});
 assert.equal(node.querySelectorAll('circle').length,2);assert.doesNotMatch(node.querySelector('svg g').getAttribute('transform'),/scale\(1\)/);node.dispose();
 const europe=createGeoMap(dom.window.document,{columns:['Continente','Clientes'],rows:[['Europa',3]]});
 assert.match(europe.querySelector('[data-country="FRA"]').getAttribute('fill'),/^hsl/);assert.doesNotMatch(europe.querySelector('[data-country="BRA"]').getAttribute('fill'),/^hsl/);europe.dispose();dom.window.close();
});
test('state names or abbreviations highlight their actual polygon without inventing city points',()=>{
 const dom=new JSDOM(),node=createGeoMap(dom.window.document,{columns:['Estado','Quantidade'],rows:[['São Paulo',10],['BA',0],['Não existe',4]]});
 assert.equal(node.querySelectorAll('circle').length,0);assert.match(node.querySelector('path[data-uf="SP"]').getAttribute('fill'),/^hsl/);
 node.querySelector('path[data-uf="BA"]').dispatchEvent(new dom.window.Event('click'));assert.match(node.querySelector('[role=status]').textContent,/Quantidade: 0/);
 assert.match(node.textContent,/2 de 3/);node.dispose();dom.window.close();
});
test('map visual cap keeps complete source table and never invents overflow points',()=>{
 const dom=new JSDOM(),node=createGeoMap(dom.window.document,{columns:['Cidade','Quantidade'],rows:Array.from({length:510},()=>['Recife',1])});
 assert.equal(node.querySelectorAll('circle').length,500);assert.equal(node.querySelectorAll('tbody tr').length,510);assert.match(node.textContent,/limite visual de 500/);node.dispose();dom.window.close();
});
test('Markdown and CES renderer disposal detaches map controls, with no fetch or script execution',()=>{
 const dom=new JSDOM('<main></main>',{url:'https://host.test'}),root=dom.window.document.querySelector('main'),data={columns:[{label:'Cidade',type:'string'},{label:'UF',type:'string'},{label:'Quantidade',type:'number'}],rows:[['Recife','PE',2]]};
 let calls=0;dom.window.fetch=()=>{calls++;throw Error('No network');};
 for(const mode of ['markdown','ces']){
  const renderer=mode==='markdown'?createChatRenderer():createDocumentRenderer();
  const handle=mode==='markdown'?renderer.render(root,{text:'```map\n'+JSON.stringify(data)+'\n```'}):renderer.update(root,{owner:'CES',format:'ccr.document',version:1,renderer:{name:'CCR',version:1},type:'data',title:'Mapa',view:'map',data});
  assert.equal(root.querySelectorAll('path[data-uf]').length,27);const button=root.querySelector('[aria-label="Ampliar mapa"]'),view=root.querySelector('svg g'),before=view.getAttribute('transform');
  handle.dispose();button.click();assert.equal(view.getAttribute('transform'),before);
 }
 assert.equal(calls,0);assert.equal(root.querySelector('script,iframe'),null);dom.window.close();
});
