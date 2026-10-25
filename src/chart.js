import {createDataTable} from './data.js';
export const localChartViews=new Set(['bar','column','line','area']);
export function createDataChart(document,value,{view=value?.view||'bar',locale='pt-BR'}={}){
  const figure=createDataTable(document,value,{locale});
  const metric=value.columns.findIndex((column,i)=>i>0&&value.rows.some(row=>typeof row[i]==='number'));
  if(!localChartViews.has(view)||metric<0||!value.rows.length||value.rows.length>100)return figure;
  const rows=value.rows.filter(row=>typeof row[metric]==='number'),values=rows.map(row=>row[metric]);
  if(!rows.length)return figure;
  const min=Math.min(0,...values),max=Math.max(0,...values),range=max-min||1;
  if(!Number.isFinite(range))return figure;
  const ns='http://www.w3.org/2000/svg';
  const node=(tag,attrs,text)=>{const el=document.createElementNS(ns,tag);for(const[key,val]of Object.entries(attrs||{}))el.setAttribute(key,String(val));if(text!==undefined)el.textContent=text;return el;};
  const height=view==='bar'?Math.max(180,rows.length*30+65):360;
  const svg=node('svg',{viewBox:`0 0 800 ${height}`,role:'img','aria-label':String(value.title||'Gráfico')});
  const label=typeof value.columns[metric]==='string'?value.columns[metric]:value.columns[metric].label;
  svg.append(node('text',{x:12,y:23,fill:'#315846','font-size':15},label));
  const fmt=new Intl.NumberFormat(locale,{maximumFractionDigits:4});
  if(view==='bar'){
    const width=520,zero=180+(0-min)/range*width;
    svg.append(node('line',{x1:zero,x2:zero,y1:35,y2:height-15,stroke:'#8da89b'}));
    rows.forEach((row,i)=>{
      const x=180+(row[metric]-min)/range*width,y=42+i*30;
      svg.append(node('text',{x:8,y:y+15,'font-size':12,fill:'#315846'},String(row[0]).slice(0,24)));
      const bar=node('rect',{x:Math.min(x,zero),y,width:Math.max(1,Math.abs(x-zero)),height:20,fill:row[metric]<0?'#b66946':'#168657',rx:2});
      bar.append(node('title',{},String(row[0])+': '+fmt.format(row[metric])));svg.append(bar);
      svg.append(node('text',{x:Math.min(750,Math.max(x,zero)+5),y:y+15,'font-size':11,fill:'#315846'},fmt.format(row[metric])));
    });
  }else{
    const left=65,top=45,width=700,plotHeight=255,scale=value=>top+(max-value)/range*plotHeight,zero=scale(0),step=width/rows.length;
    svg.append(node('line',{x1:left,x2:left+width,y1:zero,y2:zero,stroke:'#8da89b'}));
    let points=[];
    rows.forEach((row,i)=>{
      const x=left+step*(i+.5),y=scale(row[metric]);points.push([x,y]);
      if(view==='column'){
        const bar=node('rect',{x:x-step*.35,y:Math.min(y,zero),width:Math.max(1,step*.7),height:Math.max(1,Math.abs(y-zero)),fill:'#168657'});
        bar.append(node('title',{},String(row[0])+': '+fmt.format(row[metric])));svg.append(bar);
      }
      if(rows.length<=12)svg.append(node('text',{x,y:330,'text-anchor':'middle','font-size':11,fill:'#315846'},String(row[0]).slice(0,14)));
    });
    if(view!=='column'){
      if(view==='area')svg.append(node('polygon',{points:[[points[0][0],zero],...points,[points.at(-1)[0],zero]].map(p=>p.join(',')).join(' '),fill:'#cde7d9'}));
      svg.append(node('polyline',{points:points.map(p=>p.join(',')).join(' '),fill:'none',stroke:'#168657','stroke-width':3}));
      points.forEach(([x,y],i)=>{const dot=node('circle',{cx:x,cy:y,r:4,fill:'#168657'});dot.append(node('title',{},String(rows[i][0])+': '+fmt.format(rows[i][metric])));svg.append(dot);});
    }
    svg.append(node('text',{x:5,y:top+10,'font-size':11},fmt.format(max)),node('text',{x:5,y:top+plotHeight,'font-size':11},fmt.format(min)));
  }
  svg.style.width='100%';svg.style.height='auto';figure.insertBefore(svg,figure.querySelector('table'));
  figure.classList.add('chat-local-chart');figure.localChart=true;figure.ready=Promise.resolve();
  return figure;
}
