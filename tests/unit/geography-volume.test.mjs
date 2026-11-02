import test from 'node:test';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {JSDOM} from 'jsdom';
import {installGeography} from '../../src/geography.mjs';
import {createGeoMap} from '../../src/visuals.mjs';
import {validateTable} from '../../src/data-value.mjs';

test('fixed 10000 ceiling accepts full national data and rejects overflow',()=>{
 const value={columns:['Latitude','Longitude','Quantidade'],rows:Array.from({length:10000},(_,i)=>[-20+i/100000,-45,i===0?0:i])};
 assert.equal(validateTable(value).rows.length,10000);
 assert.throws(()=>validateTable({...value,rows:[...value.rows,value.rows[0]]}),/invalid_data/);
 const dom=new JSDOM();installGeography({key:'injected',states:[],cities:[],countries:[],attribution:'Synthetic volume fixture'});
 const started=performance.now(),node=createGeoMap(dom.window.document,value);
 assert.equal(node.querySelectorAll('circle').length,10000);
 assert.equal(node.querySelectorAll('tbody tr').length,10000);
 assert.match(node.textContent,/10000 de 10000/);
 assert.doesNotMatch(node.textContent,/limite visual/);
 console.log('CCR 10000 map/table synthetic render ms:',Math.round(performance.now()-started));
 node.dispose();dom.window.close();
});
