import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {configureGeography,installGeography,resolvePlace,mapLocations,geographyKey} from '../../src/geography.mjs';
import {createGeoMap} from '../../src/visuals.mjs';

const geometry=x=>({type:'Polygon',coordinates:[[[x,0],[x+1,0],[x+1,1],[x,1],[x,0]]]});
const region=(code,name,x,extra={})=>({code,name,geometry:geometry(x),latitude:.5,longitude:x+.5,...extra});
function fixture(key='injected'){
 const state=region('35','São Paulo',-47,{uf:'SP'}),a=region('3500001','Cidade Alfa',-47,{uf:'SP'}),b=region('3500002','Cidade Beta',-46,{uf:'SP'});
 return {key,states:[state],cities:[['Cidade Alfa','SP',.5,-46.5,'3500001'],['Cidade Beta','SP',.5,-45.5,'3500002']],municipalities:[a,b],regions:[a,b],countries:[],attribution:'Synthetic test boundaries',obtainedAt:'test'};
}
const value={columns:['Cidade','UF','Clientes'],rows:[['Cidade Alfa','SP',7],['Cidade Beta','SP',0]]};

test('municipal polygons replace seat dots; zero, details and disposal remain',()=>{
 installGeography(fixture());const dom=new JSDOM(),node=createGeoMap(dom.window.document,value);
 assert.equal(node.querySelectorAll('path').length,2);assert.equal(node.querySelectorAll('circle').length,0);
 assert.equal(node.querySelectorAll('tbody tr').length,2);assert.equal(resolvePlace('CIDADE ÁLFA',{state:'SP'}).code,'3500001');
 const paths=node.querySelectorAll('path');assert.notEqual(paths[0].getAttribute('fill'),paths[1].getAttribute('fill'));
 paths[1].dispatchEvent(new dom.window.Event('click'));assert.match(node.querySelector('[role=status]').textContent,/Clientes: 0/);
 const button=node.querySelector('[aria-label="Ampliar mapa"]'),view=node.querySelector('svg g');button.click();const state=view.getAttribute('transform');node.dispose();button.click();assert.equal(view.getAttribute('transform'),state);dom.window.close();
});
test('cold async host loader shares request, preserves table, then renders boundaries',async()=>{
 let calls=0;configureGeography({load:async key=>{calls++;await new Promise(r=>setTimeout(r,5));return fixture(key);}});installGeography({...fixture(),key:'other'});
 const dom=new JSDOM(),a=createGeoMap(dom.window.document,value),b=createGeoMap(dom.window.document,value);
 assert.match(a.textContent,/Preparando fronteiras/);assert.equal(a.querySelectorAll('tbody tr').length,2);
 await new Promise(r=>setTimeout(r,25));assert.equal(calls,1);assert.equal(a.querySelectorAll('path').length,2);assert.equal(b.querySelectorAll('path').length,2);a.dispose();b.dispose();dom.window.close();
});
test('network/source failure leaves explicit error and accessible data; disposal prevents late DOM work',async()=>{
 configureGeography({load:async()=>{throw Error('source down');}});installGeography({...fixture(),key:'other'});
 const dom=new JSDOM(),node=createGeoMap(dom.window.document,{columns:['País','Clientes'],rows:[['Unknown',2]]});
 await new Promise(r=>setTimeout(r,5));assert.match(node.textContent,/Mapa indisponível no momento/);assert.equal(node.querySelectorAll('tbody tr').length,1);node.dispose();dom.window.close();
});
test('GPS invalidity stays explicit; keys distinguish local and world/neighborhood demand',()=>{
 installGeography(fixture());assert.equal(geographyKey(value),'state-SP');
 assert.equal(geographyKey({columns:['Bairro','Código Município'],rows:[['Centro','3547809']]}),'neighborhoods-3547809');
 assert.equal(geographyKey({columns:['País'],rows:[['França']]}),'country-name-franca');
 const result=mapLocations({columns:['Cidade','UF','Latitude','Longitude'],rows:[['Cidade Alfa','SP',100,10],['Cidade Alfa','SP',null,null]]});
 assert.deepEqual(result.locations.map(p=>p.status),['invalid-coordinates','ready']);
});

test('simultaneous different scopes render their own payload without recirculating async loads',async()=>{
 let calls=0;configureGeography({load:async key=>{calls++;const data=fixture(key);if(key.startsWith('country-'))data.countries=[{...data.states[0],code:'FRA',name:'França',continent:'Europa'}];return data;}});installGeography({...fixture(),key:'other'});
 const dom=new JSDOM(),state=createGeoMap(dom.window.document,value),country=createGeoMap(dom.window.document,{columns:['País','Clientes'],rows:[['França',2]]});
 await new Promise(r=>setTimeout(r,15));assert.equal(state.querySelectorAll('path').length,2);assert.ok(country.querySelector('[data-country="FRA"]'));assert.ok(calls<=2);state.dispose();country.dispose();dom.window.close();
});
