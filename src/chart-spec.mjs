// Pure, dependency-free SVG scene shared by DOM and the packaged export runtime.
export const escapeXml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export const tag=(name,attrs={},body='')=>`<${name} ${Object.entries(attrs).map(([k,v])=>`${k}="${escapeXml(v)}"`).join(' ')}>${body}</${name}>`;
export const text=(x,y,value,size=16,attrs={})=>tag('text',{x,y,'font-family':'Courier','font-size':size,fill:'#203f31',...attrs},escapeXml(value));
const strict=(o,fields)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).every(k=>fields.includes(k));
export function validateChart(chart,columns,rows){
 if(!strict(chart,['series'])||!Array.isArray(chart.series)||!chart.series.length||chart.series.length>6||!rows.length||rows.length>24||rows.some(r=>String(r[0]).length>24))throw Error('invalid_chart');
 const used=new Set(),units={};
 return {series:chart.series.map(s=>{
  if(!strict(s,['column','type','axis','unit','color'])||!Number.isInteger(s.column)||s.column<1||columns[s.column]?.type!=='number'||used.has(s.column)||!['line','column'].includes(s.type)||!['left','right'].includes(s.axis)||typeof s.unit!=='string'||!s.unit.trim()||s.unit.length>24||s.color!==undefined&&!/^#[0-9a-fA-F]{6}$/.test(s.color))throw Error('invalid_series');
  if(columns[s.column].label.length>32||columns[s.column].label.length+s.unit.length>42)throw Error('series_label_limit');
  if(units[s.axis]!==undefined&&units[s.axis]!==s.unit)throw Error('axis_unit_conflict');
  used.add(s.column);units[s.axis]=s.unit;return {...s};
 })};
}
const palette=['#11764a','#295fb2','#ad4c25','#7d3e9e','#007f87','#a17400'];
export function chartScene(value,{view='column',width=800,height=380}={}){
 const explicit=value.chart!==undefined;
 let series,rows=value.rows;
 if(explicit)series=validateChart(value.chart,value.columns,rows).series;
 else{
  const column=value.columns.findIndex((c,i)=>i>0&&rows.some(r=>typeof r[i]==='number'));
  if(column<0||!rows.length||rows.length>100)return null;
  series=[{column,type:view,axis:'left',unit:''}];rows=rows.filter(r=>typeof r[column]==='number');
 }
 if(!rows.length)return null;
 const label=i=>typeof value.columns[i]==='string'?value.columns[i]:value.columns[i].label;
 const fmt=v=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:4,...(explicit&&(Math.abs(v)>=1e9||v!==0&&Math.abs(v)<1e-4)?{notation:'scientific'}:{})}).format(v);
 if(!explicit&&view==='bar'){
  height=Math.max(220,rows.length*44+85);const s=series[0],values=rows.map(r=>r[s.column]),min=Math.min(0,...values),max=Math.max(0,...values),range=max-min||1;if(!Number.isFinite(range))return null;
  const zero=210+(0-min)/range*440;let body=text(12,28,label(s.column),20,{'font-weight':700})+tag('line',{x1:zero,x2:zero,y1:42,y2:height-15,stroke:'#718c7e'});
  rows.forEach((r,i)=>{const x=210+(r[s.column]-min)/range*440,y=52+i*44;body+=text(8,y+22,String(r[0]),16)+tag('rect',{x:Math.min(x,zero),y,width:Math.max(1,Math.abs(x-zero)),height:30,fill:r[s.column]<0?'#a6502c':'#11764a'},tag('title',{},escapeXml(`${r[0]}: ${fmt(r[s.column])}`)))+text(786,y+22,fmt(r[s.column]),17,{'text-anchor':'end','font-weight':700});});return {width,height,body};
 }
 const axes={};
 for(const s of series){const vals=series.filter(t=>t.axis===s.axis).flatMap(t=>rows.map(r=>r[t.column]).filter(v=>v!==null));const min=Math.min(0,...vals),max=Math.max(0,...vals),range=max-min||1;if(!Number.isFinite(range)){if(!explicit)return null;throw Error('chart_range');}axes[s.axis]={min,max,range,unit:s.unit};}
 const dense=rows.length>12||rows.some(r=>String(r[0]).length*8>(width-170)/rows.length);
 const labelSpace=dense?Math.max(65,...rows.map(r=>String(r[0]).length*8*.71+24)):65;
 const left=85,right=width-85,top=85,bottom=height-labelSpace,step=(right-left)/rows.length;
 const scale=(v,axis)=>bottom-(v-axes[axis].min)/axes[axis].range*(bottom-top);
 let body='';
 series.forEach((s,i)=>{const color=s.color||palette[i];body+=tag('line',{x1:12+(i%2)*(width/2),x2:24+(i%2)*(width/2),y1:14+Math.floor(i/2)*22,y2:14+Math.floor(i/2)*22,stroke:color,'stroke-width':10});body+=text(30+(i%2)*(width/2),20+Math.floor(i/2)*22,`${label(s.column)}${s.unit?' ('+s.unit+')':''}`,13);});
 for(const [axis,a] of Object.entries(axes)){
  const x=axis==='left'?5:width-5,anchor=axis==='left'?'start':'end';
  body+=text(x,top-8,a.unit,13,{'text-anchor':anchor})+text(x,top+15,fmt(a.max),13,{'text-anchor':anchor})+text(x,bottom,fmt(a.min),13,{'text-anchor':anchor});
  body+=tag('line',{x1:left,x2:right,y1:scale(0,axis),y2:scale(0,axis),stroke:'#a0b2aa'});
 }
 const columns=series.filter(s=>s.type==='column');
 series.forEach((s,i)=>{
  const color=s.color||palette[i],zero=scale(0,s.axis);let points=[];
  const flush=()=>{if(points.length){if(s.type==='area')body+=tag('polygon',{points:[[points[0][0],zero],...points,[points.at(-1)[0],zero]].map(p=>p.join(',')).join(' '),fill:'#cde7d9'});body+=tag('polyline',{points:points.map(p=>p.join(',')).join(' '),fill:'none',stroke:color,'stroke-width':3});points=[];}};
  rows.forEach((r,j)=>{
   const v=r[s.column],x=left+step*(j+.5);if(v===null){flush();return;}const y=scale(v,s.axis),hint=tag('title',{},escapeXml(`${r[0]}: ${fmt(v)} ${s.unit}`));
   if(s.type==='column'||s.type==='bar'){
    const w=step*.7/Math.max(1,columns.length),offset=explicit?(columns.indexOf(s)-(columns.length-1)/2)*w:0;
    body+=tag('rect',{x:x+offset-w/2,y:Math.min(y,zero),width:w,height:Math.max(1,Math.abs(y-zero)),fill:color,'data-value':v},hint);
   }else{points.push([x,y]);body+=tag('circle',{cx:x,cy:y,r:4,fill:color,'data-value':v},hint);}
   if(!explicit&&rows.length<=12)body+=text(x,Math.max(47,y-10),fmt(v),17,{'text-anchor':'middle','font-weight':700});
  });flush();
 });
 // All categories remain present, including null-only categories. Rotate dense labels.
 rows.forEach((r,j)=>{const x=left+step*(j+.5),y=bottom+24;body+=text(x,y,r[0]===null?'Sem dado':r[0],13,{'text-anchor':dense?'end':'middle',...(dense?{transform:`rotate(-45 ${x} ${y})`}:{})});});
 return {width,height,body};
}
export function sceneSvg(scene,title='Gráfico'){
 return tag('svg',{xmlns:'http://www.w3.org/2000/svg','xmlns:xlink':'http://www.w3.org/1999/xlink',viewBox:`0 0 ${scene.width} ${scene.height}`,width:scene.width,height:scene.height,'font-family':'monospace',role:'img','aria-label':title},tag('title',{},escapeXml(title))+scene.body);
}
