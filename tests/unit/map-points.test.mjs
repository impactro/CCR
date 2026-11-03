import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createGeoMap,installGeography} from '../../src/index.js';
import {mapPoints} from '../../src/map-points.mjs';

const a={code:'3500001',name:'Alfa',uf:'SP',latitude:-23.5,longitude:-46.5,geometry:{type:'Polygon',coordinates:[[[-47,-24],[-46,-24],[-46,-23],[-47,-23],[-47,-24]]]}};
const install=()=>installGeography({key:'injected',states:[{...a,code:'35',name:'São Paulo'}],cities:[['Alfa','SP',-23.5,-46.5,a.code]],municipalities:[a],regions:[a],countries:[],attribution:'IBGE synthetic attribution',obtainedAt:'test'});
const data={columns:['Código município','UF','Clientes'],rows:[[a.code,'SP',102]]};
const reference={key:'city:3500001',label:'Alfa · aproximado',latitude:-23.5,longitude:-46.5,kind:'municipal-reference',code:a.code,count:101};
const exact={key:'client:022',label:'<b>Cliente</b>',latitude:-23.6,longitude:-46.6,kind:'coordinate',code:a.code,count:1};

test('overlay preserves area counts and distinguishes supplied point from municipal fallback',()=>{
 install();const dom=new JSDOM(),events=[];
 const node=createGeoMap(dom.window.document,data,{pointLayer:[exact,reference],onSelect:e=>events.push(e),table:'hidden',annotations:'compact'});
 assert.equal(node.querySelectorAll('circle').length,2);assert.equal(node.querySelector('path').getAttribute('fill'),'hsl(0 70% 45%)');
 const p=node.querySelector('[data-point-key="client:022"]');p.dispatchEvent(new dom.window.Event('click'));
 assert.equal(events[0].pointKey,'client:022');assert.equal(events[0].source,'points');assert.equal(events[0].kind,'coordinate');assert.equal(events[0].rows[0].key,'client:022');
 assert.equal(node.querySelector('b'),null);
 const ref=node.querySelector('[data-point-key="city:3500001"]');assert.equal(ref.querySelector('circle').getAttribute('stroke-dasharray'),'3 2');
 ref.dispatchEvent(new dom.window.Event('click'));assert.equal(events[1].kind,'municipal-reference');assert.match(node.querySelector('.chat-geographic-detail').textContent,/não é endereço exato/);
 assert.equal(node.querySelector('table').hidden,true);assert.equal(node.querySelector('.chat-geographic-summary').hidden,true);
 assert.equal(node.querySelector('.chat-geographic-attribution').textContent,'IBGE synthetic attribution');
 node.dispose();p.dispatchEvent(new dom.window.Event('click'));assert.equal(events.length,2);dom.window.close();
});

test('overlay input is bounded and rejects duplicate identities, accessors and invalid coordinates',()=>{
 for(const points of [[exact,exact],[{...exact,latitude:NaN}],[{...exact,latitude:91}],[{...exact,count:0}],[{...exact,endpoint:'/unsafe'}]])assert.throws(()=>mapPoints(points));
 let called=0;const malicious={...exact};Object.defineProperty(malicious,'label',{get(){called++;return 'bad';}});assert.throws(()=>mapPoints([malicious]));assert.equal(called,0);
 assert.throws(()=>mapPoints(Array.from({length:10001},()=>exact)),/limit/);
});
