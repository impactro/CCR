import {decodeRichDocument} from './rich-document.mjs';
import {chartScene,sceneSvg,tag,text,escapeXml} from './chart-spec.mjs';
export const PAGE_WIDTH=1200,PAGE_HEIGHT=1600,MAX_PAGES=32;
const gap=20,margin=36,contentWidth=PAGE_WIDTH-margin*2;
function lines(value,chars){
 const result=[];for(const line of String(value).split('\n')){const points=Array.from(line);if(!points.length)result.push('');else for(let i=0;i<points.length;i+=chars)result.push(points.slice(i,i+chars).join(''));}return result;
}
function paragraph(value,width,x,y,size=16){
 const list=lines(value,Math.max(1,Math.floor(width/(size*.65))));
 return {body:list.map((v,i)=>text(x,y+i*(size+6),v,size)).join(''),height:list.length*(size+6)};
}
function imageData(resource){
 if(!resource||Object.keys(resource).some(k=>!['mime','base64','width','height'].includes(k))||!['image/png','image/jpeg'].includes(resource.mime)||typeof resource.base64!=='string'||resource.base64.length<12||resource.base64.length>8_000_000||! /^[A-Za-z0-9+/]*={0,2}$/.test(resource.base64)||!Number.isInteger(resource.width)||!Number.isInteger(resource.height)||resource.width<1||resource.height<1||resource.width*resource.height>16_000_000)throw Error('invalid_image_resource');
 return `data:${resource.mime};base64,${resource.base64}`;
}
function panel(doc,width,resolveResource){
 const heading=paragraph(doc.title,width-24,12,26,18);let body=heading.body,y=heading.height+18;
 if(doc.type==='text'){const p=paragraph(doc.data.text,width-24,12,y+18);body+=p.body;y+=p.height+20;}
 else if(doc.type==='image'){
  const resource=resolveResource?.(doc.data.resourceId);if(!resource)throw Error('missing_image_resource');
  const href=imageData(resource),h=Math.min(300,(width-24)*resource.height/resource.width);
  body+=tag('image',{x:12,y,width:width-24,height:h,href,'xlink:href':href,preserveAspectRatio:'xMidYMid meet'},tag('title',{},escapeXml(doc.data.alt)));y+=h+8;
  const alt=paragraph(doc.data.alt,width-24,12,y+16,13);body+=alt.body;y+=alt.height+16;
 }else if(doc.type==='data'){
  if(doc.view==='table'){
   const table=tableChunk(doc,doc.data.rows,width);body+=tag('g',{transform:`translate(0 ${y})`},table.body);y+=table.height;
  }else if(['bar','column','line','area'].includes(doc.view)){
   // Reject illegible panels instead of omitting any category/legend label.
   if(width<500||doc.data.rows.length>24||doc.data.rows.some(r=>String(r[0]).length>24)||doc.data.columns.some(c=>c.label.length>32)||doc.data.chart?.series.some(s=>doc.data.columns[s.column].label.length+s.unit.length>42))throw Error('chart_layout_limit');
   const scene=chartScene(doc.data,{view:doc.view,width:Math.max(width,760),height:400});if(!scene)throw Error('chart_not_renderable');
   const scale=(width-24)/scene.width;body+=tag('g',{transform:`translate(12 ${y}) scale(${scale})`},scene.body);y+=scene.height*scale;
  }else throw Error('export_view_unsupported');
  for(const key of ['source','period','note'])if(doc.data[key]){const p=paragraph(doc.data[key],width-24,12,y+16,13);body+=p.body;y+=p.height+8;}
 }else throw Error('export_type_unsupported');
 return {body,height:y+16};
}
function tableChunk(doc,rows,width){
 const n=doc.data.columns.length,cw=(width-24)/n,chars=Math.floor((cw-12)/9);if(chars<3)throw Error('table_layout_limit');
 let body='',y=0;
 const row=(values,head=false)=>{
  // HTML is not guessed/stripped differently from the Web sanitizer.
  if(doc.data.columns.some(c=>c.type==='html'))throw Error('export_html_cell_unsupported');
  const wrapped=values.map(v=>lines(v===null?'Sem dado':typeof v==='boolean'?v?'Sim':'Não':v,chars)),h=Math.max(...wrapped.map(a=>a.length))*22+12;
  if(h>600)throw Error('table_cell_layout_limit');
  body+=tag('rect',{x:12,y,width:width-24,height:h,fill:head?'#e2eee8':'#ffffff',stroke:'#b9cdc0'});
  wrapped.forEach((a,i)=>a.forEach((v,j)=>{body+=text(18+i*cw,y+22+j*22,v,15,head?{'font-weight':700}:{});}));y+=h;
 };
 row(doc.data.columns.map(c=>c.label),true);rows.forEach(r=>row(r));return {body,height:y+12};
}
/** Pure bounded pages. Used verbatim by the browser and by Node/PyMuPDF. */
export function documentPages(input,{resolveResource}={}){
 const decoded=decodeRichDocument(input);if(decoded.status!=='ready')throw Error(decoded.code||decoded.status);
 const doc=decoded.document,pages=[];let body='',y=margin;
 const newPage=()=>{if(body){pages.push({width:PAGE_WIDTH,height:PAGE_HEIGHT,body});if(pages.length>MAX_PAGES)throw Error('page_limit');}body='';y=margin;};
 const add=(p,x=margin)=>{if(p.height>PAGE_HEIGHT-margin*2)throw Error('panel_layout_limit');if(y+p.height>PAGE_HEIGHT-margin)newPage();body+=tag('g',{transform:`translate(${x} ${y})`},p.body);y+=p.height+gap;};
 if(doc.type==='report'){
  const title=paragraph(doc.title,contentWidth,0,26,24);add({body:title.body,height:title.height+12});
  const report=(reportDoc,width,x,depth)=>{
   if(depth>0)throw Error('nested_report_export_unsupported');
   const cols=reportDoc.data.columns,w=(width-gap*(cols-1))/cols;
   for(let i=0;i<reportDoc.data.sections.length;i+=cols){
    const panels=reportDoc.data.sections.slice(i,i+cols).map(d=>panel(d,w,resolveResource)),height=Math.max(...panels.map(p=>p.height));
    add({height,body:panels.map((p,j)=>tag('g',{transform:`translate(${j*(w+gap)} 0)`},tag('rect',{x:0,y:0,width:w,height,rx:6,fill:'#ffffff',stroke:'#b9cdc0'})+p.body)).join('')},x);
   }
  };report(doc,contentWidth,margin,0);
 }else if(doc.type==='data'&&doc.view==='table'){
  // Greedy pagination with a repeated title and column header; no row slicing.
  let rows=[];
  const emit=()=>{add(panel({...doc,data:{...doc.data,rows}},contentWidth,resolveResource));rows=[];};
  for(const row of doc.data.rows){const candidate=[...rows,row],p=panel({...doc,data:{...doc.data,rows:candidate}},contentWidth,resolveResource);if(p.height>PAGE_HEIGHT-margin*2){if(!rows.length)throw Error('table_row_layout_limit');emit();newPage();}rows.push(row);}
  if(rows.length||!doc.data.rows.length)emit();
 }else add(panel(doc,contentWidth,resolveResource));
 newPage();return pages.map((p,i)=>sceneSvg({...p,body:tag('rect',{width:p.width,height:p.height,fill:'#ffffff'})+p.body+text(margin,PAGE_HEIGHT-12,`${i+1}/${pages.length}`,12)},doc.title));
}
