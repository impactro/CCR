import {createDataTable} from './data.js';

/** Numeric heatmap, retaining the same accessible typed table and null values. */
export function createHeatmap(document,value,{locale='pt-BR'}={}){
 const figure=createDataTable(document,value,{locale});figure.classList.add('chat-heatmap');
 const values=value.rows.flatMap(row=>row.filter(cell=>typeof cell==='number'&&Number.isFinite(cell)));
 if(!values.length)return figure;
 const min=Math.min(...values),max=Math.max(...values),span=max-min;
 for(const [i,row] of [...figure.querySelectorAll('tbody tr')].entries())for(const [j,cell] of [...row.children].entries()){
  const number=value.rows[i]?.[j];if(typeof number!=='number'||!Number.isFinite(number))continue;
  const ratio=span?(number-min)/span:.5;
  cell.style.backgroundColor=`hsl(${210-ratio*190} 70% ${90-ratio*45}%)`;cell.style.color=ratio>.7?'#fff':'#152c36';
  cell.title=String(number);cell.dataset.heatValue=String(number);
 }
 return figure;
}

/** Shared geographic map, retaining the synchronous Node API. */
export {createGeographicMap as createGeoMap} from './geographic-map.mjs';
