import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createGeoMap,createChatRenderer,createDocumentRenderer,installGeography} from '../../src/index.js';
import {mapLocations,geographyKey,configureGeography} from '../../src/geography.mjs';

const square=(x,y,size=1)=>({type:'Polygon',coordinates:[[[x,y],[x+size,y],[x+size,y+size],[x,y+size],[x,y]]]});
function fixture(key='injected'){
 const a={code:'3500001',name:'Alfa',uf:'SP',geometry:square(-47,-24),latitude:-23.5,longitude:-46.5};
 const b={...a,code:'3500002',name:'Beta',geometry:square(-46,-24),longitude:-45.5};
 return {key,states:[{code:'35',name:'São Paulo',uf:'SP',geometry:square(-70,-40,30)}],cities:[['Alfa','SP',-23.5,-46.5,a.code],['Beta','SP',-23.5,-45.5,b.code]],municipalities:[a,b],regions:[a,b],countries:[],attribution:'Synthetic boundaries',obtainedAt:'test'};
}
const data={columns:['Código município','UF','Clientes'],rows:[['3500001','SP',2]]};
const doc=()=>({owner:'CES',format:'ccr.document',version:1,renderer:{name:'CCR',version:1},type:'data',view:'map',title:'Synthetic clients',data:{...data,columns:data.columns.map((label,i)=>({label,type:i===2?'number':'string'}))}});

test('IBGE maps by exact code; mismatching UF is not accepted',()=>{
 installGeography(fixture());assert.equal(geographyKey(data),'state-SP');
 assert.equal(mapLocations(data).locations[0].label,'Alfa/SP');
 assert.equal(mapLocations({...data,rows:[['3500001','MG',2]]}).locations[0].status,'unknown-state');
 assert.equal(mapLocations({...data,rows:[['9999999','SP',2]]}).locations[0].status,'unknown-city');
});

test('area callback carries stable identity, frozen row keys and no privileged data; keyboard and disposal work',()=>{
 installGeography(fixture());const dom=new JSDOM(),events=[];
 const node=createGeoMap(dom.window.document,data,{onSelect:e=>events.push(e),rowKey:(row,index)=>'client-group-'+index,table:'collapsed'});
 const a=node.querySelector('[data-area-code="3500001"]');a.dispatchEvent(new dom.window.Event('click'));
 assert.deepEqual(events[0],{type:'area',kind:'municipality',code:'3500001',uf:'SP',coordinates:null,label:'Alfa · SP',rows:[{index:0,key:'client-group-0'}]});
 assert.ok(Object.isFrozen(events[0])&&Object.isFrozen(events[0].rows)&&Object.isFrozen(events[0].rows[0]));
 assert.equal(a.getAttribute('aria-pressed'),'true');
 const b=node.querySelector('[data-area-code="3500002"]');b.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Enter'}));
 assert.deepEqual(events[1].rows,[]);assert.equal(events[1].code,'3500002');assert.equal(a.getAttribute('aria-pressed'),'false');
 assert.ok(node.querySelector('details table'));node.dispose();a.dispatchEvent(new dom.window.Event('click'));assert.equal(events.length,2);
 dom.window.close();
});

test('municipal focus uses selected boundaries instead of a distant whole-state center',()=>{
 installGeography(fixture());const dom=new JSDOM(),node=createGeoMap(dom.window.document,data);
 const transform=node.querySelector('svg > g').getAttribute('transform');
 const [,tx,ty,z]=transform.match(/translate\(([-\d.]+) ([-\d.]+)\) scale\(([-\d.]+)\)/).map(Number);
 const pairs=[...node.querySelector('[data-area-code="3500001"]').getAttribute('d').matchAll(/[ML]([-\d.]+) ([-\d.]+)/g)];
 for(const [,x,y] of pairs){const px=(Number(x)-400)*z+tx,py=(Number(y)-270)*z+ty;assert.ok(px>=0&&px<=800&&py>=0&&py<=540,`${px},${py}`);}
 node.dispose();dom.window.close();
});

test('provided GPS produces a point event without claiming an address',()=>{
 installGeography(fixture());const dom=new JSDOM(),events=[];
 const node=createGeoMap(dom.window.document,{columns:['Nome','Latitude','Longitude'],rows:[['Cliente sintético',-23.6,-46.7]]},{onSelect:e=>events.push(e)});
 node.querySelector('[data-location-kind="coordinate"]').dispatchEvent(new dom.window.Event('click'));
 assert.equal(events[0].kind,'coordinate');assert.equal(events[0].code,null);assert.deepEqual(events[0].coordinates,{latitude:-23.6,longitude:-46.7});
 node.dispose();dom.window.close();
});

test('document and Markdown hosts forward map options and remove callbacks on replacement',()=>{
 installGeography(fixture());const dom=new JSDOM('<main></main>'),mount=dom.window.document.querySelector('main'),events=[];
 const renderer=createDocumentRenderer({mapOptions:{onSelect:e=>events.push(e)}});renderer.update(mount,doc());
 const old=mount.querySelector('[data-area-code]');old.dispatchEvent(new dom.window.Event('click'));renderer.dispose(mount);old.dispatchEvent(new dom.window.Event('click'));assert.equal(events.length,1);
 const chat=createChatRenderer({mapOptions:{onSelect:e=>events.push(e)}});chat.update(mount,{text:'```map\n'+JSON.stringify(data)+'\n```'});
 mount.querySelector('[data-area-code]').dispatchEvent(new dom.window.Event('click'));assert.equal(events.length,2);chat.dispose(mount);dom.window.close();
});

test('async geography preserves selection options and cancelled loads never notify',async()=>{
 configureGeography({load:async key=>fixture(key)});installGeography(fixture('other'));
 const dom=new JSDOM(),events=[],node=createGeoMap(dom.window.document,data,{onSelect:e=>events.push(e)});
 await new Promise(r=>setTimeout(r,10));node.querySelector('[data-area-code]').dispatchEvent(new dom.window.Event('click'));assert.equal(events.length,1);node.dispose();dom.window.close();
});
