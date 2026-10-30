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

/** Offline coordinate map; hosts may supply a richer authorized map plugin.
 * No geocoding, address inference, remote scripts or data fetching. */
export function createGeoMap(document,value,{locale='pt-BR'}={}){
 const figure=createDataTable(document,value,{locale});figure.classList.add('chat-geo-map');
 const names=value.columns.map(column=>String(typeof column==='string'?column:column.label).trim().toLowerCase());
 const lat=names.findIndex(name=>['lat','latitude'].includes(name)),lon=names.findIndex(name=>['lon','lng','longitude'].includes(name));
 if(lat<0||lon<0)return figure;
 const points=value.rows.filter(row=>typeof row[lat]==='number'&&typeof row[lon]==='number'&&Number.isFinite(row[lat])&&Number.isFinite(row[lon])&&Math.abs(row[lat])<=90&&Math.abs(row[lon])<=180).slice(0,500);
 if(!points.length)return figure;
 const ns='http://www.w3.org/2000/svg',make=(tag,attributes={},text)=>{const node=document.createElementNS(ns,tag);for(const[key,val]of Object.entries(attributes))node.setAttribute(key,String(val));if(text!==undefined)node.textContent=text;return node;};
 const svg=make('svg',{viewBox:'0 0 800 440',role:'img','aria-label':String(value.title||'Mapa de coordenadas')});
 svg.append(make('rect',{x:20,y:20,width:760,height:380,fill:'#eef5f8',stroke:'#94abb7'}));
 for(let latitude=-60;latitude<=60;latitude+=30){const y=20+(90-latitude)/180*380;svg.append(make('line',{x1:20,x2:780,y1:y,y2:y,stroke:'#cedee5'}));svg.append(make('text',{x:22,y:y-3,'font-size':11,fill:'#486575'},`${latitude}°`));}
 for(let longitude=-120;longitude<=120;longitude+=60){const x=20+(longitude+180)/360*760;svg.append(make('line',{x1:x,x2:x,y1:20,y2:400,stroke:'#cedee5'}));svg.append(make('text',{x:x+3,y:415,'font-size':11,fill:'#486575'},`${longitude}°`));}
 const label=names.findIndex((_,index)=>index!==lat&&index!==lon&&value.rows.some(row=>typeof row[index]==='string'));
 for(const row of points){
  const x=20+(row[lon]+180)/360*760,y=20+(90-row[lat])/180*380;
  const link=make('a',{href:`https://www.google.com/maps?q=${row[lat]},${row[lon]}`,target:'_blank',rel:'noopener noreferrer'});
  const dot=make('circle',{cx:x,cy:y,r:6,fill:'#087f8c',stroke:'#fff','stroke-width':2});
  dot.append(make('title',{},`${label>=0?row[label]+' · ':''}${row[lat]}, ${row[lon]}`));link.append(dot);svg.append(link);
 }
 figure.prepend(svg);return figure;
}
