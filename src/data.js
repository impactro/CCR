import {validateTable} from './data-value.mjs';
const INLINE_TAGS=new Set(['B','STRONG','EM','I','U','S','BR','CODE','SMALL','SPAN']);
const DROP_TAGS=new Set(['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','SVG','MATH','LINK','META','BASE','FORM','INPUT','BUTTON','TEXTAREA']);
function inlineHtml(document,text){
 const parsed=document.createElement('template'),fragment=document.createDocumentFragment();parsed.innerHTML=text;
 const copy=(source,target)=>{for(const node of source.childNodes){
  if(node.nodeType===3)target.append(document.createTextNode(node.textContent));
  else if(node.nodeType===1&&!DROP_TAGS.has(node.tagName)){
   const next=INLINE_TAGS.has(node.tagName)?document.createElement(node.tagName.toLowerCase()):document.createDocumentFragment();
   copy(node,next);target.append(next);
  }
 }};copy(parsed.content,fragment);return fragment;
}
export function createDataTable(document, value, {locale='pt-BR'}={}) {
  const validated=validateTable(value);
  const wrap = document.createElement('figure'); wrap.className = 'chat-data';
  const title = document.createElement('figcaption'); title.textContent = String(value.title || 'Dados').slice(0, 180);
  wrap.tabIndex=0; wrap.setAttribute('role','group'); wrap.setAttribute('aria-label',title.textContent);
  const table = document.createElement('table'), head = document.createElement('thead'), tr = document.createElement('tr');
  for (const column of validated.columns) { const th = document.createElement('th'); th.scope = 'col'; th.textContent = column.label; if(column.type==='number')th.dataset.type='number'; tr.append(th); }
  head.append(tr); table.append(head);
  const body = document.createElement('tbody');
  const number=new Intl.NumberFormat(locale,{maximumFractionDigits:6});
  for (const row of validated.rows) {
    const line = document.createElement('tr');
    row.forEach((value,index)=>{const td=document.createElement('td'),type=validated.columns[index].type;
      if(type)td.dataset.type=type;
      else if(typeof value==='number')td.dataset.type='number';
      if(value===null)td.dataset.empty='true';
      if(value!==null&&type==='html')td.append(inlineHtml(document,value));
      else td.textContent=value===null?'Sem dado':typeof value==='number'?number.format(value):typeof value==='boolean'?value?'Sim':'Não':value;
      line.append(td);
    });
    body.append(line);
  }
  table.append(body); wrap.append(title, table);
  const details=[value.source,value.period,value.note].filter(item=>typeof item==='string'&&item.trim()).map(item=>item.slice(0,800));
  if(details.length){const source=document.createElement('figcaption');source.className='chat-data-source';source.textContent=details.join(' · ');wrap.append(source);}
  return wrap;
}
