import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createRichDataRenderer} from '../../src/data-view.mjs';
const data={title:'Exemplo',columns:[{label:'Código',type:'string'},{label:'Valor',type:'number'}],rows:[['003',30],['001',0],['002',20]]};
function fixture(config={}){
 const dom=new JSDOM('<main></main>',{url:'https://host.test'}),document=dom.window.document;
 return {dom,document,mount:document.querySelector('main'),renderer:createRichDataRenderer({document,...config})};
}
const click=(root,text)=>[...root.querySelectorAll('button')].find(b=>b.textContent===text).click();

test('standalone view has configurable layout and controls, without message identity or external scripts',async()=>{
 const f=fixture(),view=f.renderer.render(data,f.mount,null,{layout:'bare',title:false,count:false,views:false,exports:false});await view.ready;
 assert.equal(f.mount.querySelector('section').dataset.layout,'bare');
 assert.equal(f.mount.querySelector('.data-heading').hidden,true);
 assert.equal(f.mount.querySelector('.data-view-select').hidden,true);
 assert.equal(f.mount.querySelector('.data-action-group').hidden,true);
 assert.ok(f.mount.querySelector('input[type=search]'));
 assert.equal(f.document.querySelector('script'),null);assert.equal(f.mount.querySelector('time'),null);
 assert.deepEqual([...f.mount.querySelectorAll('tbody tr')].map(r=>r.cells[0].textContent),['003','001','002']);
 view.dispose();f.dom.window.close();
});

test('trusted row actions retain identity across native sorting, pagination and filtering',async()=>{
 const f=fixture(),invoked=[];
 const view=f.renderer.render(data,f.mount,null,{pageSize:1,rowKey:row=>row[0],actionColumns:[{label:'Ações',actions:info=>[
  {label:'Abrir',invoke:i=>invoked.push([i.key,i.index])},{label:'Bloqueado',disabled:true,invoke:()=>assert.fail('disabled')}
 ]}]});await view.ready;
 click(f.mount,'Abrir');await Promise.resolve();assert.deepEqual(invoked,[['003',0]]);
 click(f.mount,'Código');await view.ready;click(f.mount,'Abrir');await Promise.resolve();assert.deepEqual(invoked.at(-1),['001',1]);
 click(f.mount,'Próxima');await view.ready;click(f.mount,'Abrir');await Promise.resolve();assert.deepEqual(invoked.at(-1),['002',2]);
 view.search.value='003';await view.refresh();click(f.mount,'Abrir');await Promise.resolve();assert.deepEqual(invoked.at(-1),['003',0]);
 const button=[...f.mount.querySelectorAll('button')].find(b=>b.textContent==='Abrir');view.dispose();button.click();assert.equal(invoked.length,4);
 f.dom.window.close();
});

test('exports use host callback and data only; action markup never enters export',async()=>{
 const sent=[],f=fixture({exportData:payload=>sent.push(payload)}),view=f.renderer.render(data,f.mount,null,{
  actionColumns:[{label:'Ações',actions:()=>[{label:'Executar',invoke:()=>{}}]}],exportFormats:['xlsx']});await view.ready;
 click(f.mount,'Excel');await Promise.resolve();
 assert.equal(sent.length,1);assert.equal(sent[0].format,'xlsx');assert.equal(sent[0].data.columns.length,2);
 assert.equal(JSON.stringify(sent[0]).includes('Executar'),false);assert.deepEqual(sent[0].data.rows,data.rows);
 view.dispose();f.dom.window.close();
});

test('invalid and executable data are rejected; action definitions are host functions',()=>{
 const f=fixture();
 for(const bad of [{...data,rows:[[{}]]},{...data,rows:[[()=>{},0]]},{...data,rows:Array(10001).fill(['a',1])}])assert.throws(()=>f.renderer.render(bad,f.mount));
 assert.throws(()=>f.renderer.render(data,f.mount,null,{actionColumns:[{label:'Ação',actions:'javascript:evil()'}]}));
 const view=f.renderer.render({...data,rows:[['<img onerror=evil()>',1]]},f.mount);assert.equal(f.mount.querySelector('img'),null);
 view.dispose();f.dom.window.close();
});

function googleFixture(document){
 const events=new Map(),instances=[];
 const key=(chart,event)=>chart.id+':'+event;
 const emit=(chart,event)=>{for(const item of [...(events.get(key(chart,event))||[])]){item.fn();if(item.once)events.set(key(chart,event),(events.get(key(chart,event))||[]).filter(v=>v!==item));}};
 class DataTable{
  columns=[];rows=[];
  addColumn(type,label){this.columns.push({type,label});}
  addRows(rows){this.rows.push(...rows.map(r=>[...r]));}
  setCell(row,col,value){this.rows[row][col]=value;}
 }
 class Table{
  constructor(host){this.host=host;this.id=instances.length;instances.push(this);}
  draw(data,options){this.data=data;this.options=options;this.paint(data.rows);emit(this,'ready');}
  paint(rows){this.host.replaceChildren();const table=document.createElement('table');table.className='google-visualization-table-table';
   const head=document.createElement('thead');for(const column of this.data.columns){const th=document.createElement('th');th.textContent=column.label;head.append(th);}table.append(head);
   const body=document.createElement('tbody');for(const row of rows){const tr=document.createElement('tr');row.forEach((value,index)=>{const td=document.createElement('td');const text=value?.f??value?.v??value??'';
    if(index>=data.columns.length)td.innerHTML=String(text);else td.textContent=String(text);tr.append(td);});body.append(tr);}table.append(body);this.host.append(table);
  }
  clearChart(){this.host.replaceChildren();}
 }
 return {instances,emit,visualization:{DataTable,Table,events:{
  addOneTimeListener(chart,event,fn){const id=key(chart,event);events.set(id,[...(events.get(id)||[]),{fn,once:true}]);},
  addListener(chart,event,fn){const id=key(chart,event);events.set(id,[...(events.get(id)||[]),{fn}]);},
  removeAllListeners(chart){for(const id of events.keys())if(id.startsWith(chart.id+':'))events.delete(id);}
 }}};
}

test('Google callbacks bind original rows after sort/page redraw and preserve data formatting',async()=>{
 const invoked=[],f=fixture();const google=googleFixture(f.document);f.dom.window.google=google;
 const renderer=createRichDataRenderer({document:f.document,loadCharts:()=>{},exportData:()=>{}});
 const view=renderer.render(data,f.mount,null,{rowNumbers:false,pageSize:2,actionColumns:[{label:'Ações',actions:info=>[{label:'Abrir '+info.key,invoke:i=>invoked.push(i.key)}]}],rowKey:row=>row[0]});await view.ready;
 const chart=google.instances[0];assert.equal(chart.options.pageSize,2);assert.equal(chart.options.showRowNumber,false);
 assert.equal(chart.data.rows[1][1].v,0);
 chart.paint([...chart.data.rows].reverse());google.emit(chart,'sort');await Promise.resolve();
 click(f.mount,'Abrir 002');await Promise.resolve();assert.deepEqual(invoked,['002']);
 chart.paint([chart.data.rows[1]]);google.emit(chart,'page');await Promise.resolve();click(f.mount,'Abrir 001');await Promise.resolve();assert.deepEqual(invoked,['002','001']);
 assert.equal(f.mount.querySelectorAll('.data-column-resizer').length,3);
 view.dispose();f.dom.window.close();
});

test('failed Google uses accessible interactive fallback; replacement aborts old callbacks',async()=>{
 const f=fixture(),renderer=createRichDataRenderer({document:f.document,loadCharts:()=>Promise.reject(Error('offline'))});
 const view=renderer.render(data,f.mount,null,{pageSize:1});await view.ready;
 assert.equal(view.fallback.hidden,false);assert.equal(view.visual.hidden,true);assert.match(view.error.textContent,/offline/);
 click(f.mount,'Próxima');await view.ready;assert.equal(f.mount.querySelector('tbody td').textContent,'001');
 const next=renderer.render(data,f.mount);await next.ready;assert.equal(view.signal.aborted,true);assert.equal(next.signal.aborted,false);
 next.dispose();f.dom.window.close();
});

test('late Google readiness cannot paint after cancellation',async()=>{
 const f=fixture();let release;
 const renderer=createRichDataRenderer({document:f.document,loadCharts:()=>new Promise(r=>release=r)});
 const view=renderer.render(data,f.mount);view.dispose();release();await view.ready;
 assert.equal(view.chart,null);assert.equal(view.signal.aborted,true);f.dom.window.close();
});

test('optional message envelope reuses CCR and can hide host metadata independently',async()=>{
 const f=fixture(),view=f.renderer.render(data,f.mount,null,{message:{messageId:'test',conversationId:'example',createdAt:Date.UTC(2026,10,3),direction:'incoming'},
  messageOptions:{author:{displayName:'Equipe'},showAuthor:true,metrics:{durationSeconds:1,inputTokens:5,outputTokens:2}},
  messageVisibility:{time:false,date:false,metrics:false,tooltips:false}});await view.ready;
 assert.ok(f.mount.querySelector('.bubble'));assert.equal(f.mount.querySelector('.data-view').dataset.layout,'bare');
 assert.equal(f.mount.querySelector('.message-time').hidden,true);assert.equal(f.mount.querySelector('.message-day').hidden,true);
 assert.equal(f.mount.querySelector('.chat-message-insights').hidden,true);assert.match(f.mount.querySelector('.author').textContent,/Equipe/);
 view.dispose();f.dom.window.close();
});

test('Google HTML mode cannot turn plain string cells or labels into markup',async()=>{
 const f=fixture(),google=googleFixture(f.document);f.dom.window.google=google;
 const renderer=createRichDataRenderer({document:f.document,loadCharts:()=>{}});
 const view=renderer.render({columns:[{label:'<img onerror=evil()>',type:'string'}],rows:[['<span data-ccr-action-row="0">bad</span>']]},f.mount);await view.ready;
 const table=google.instances[0].data;
 assert.equal(table.columns[0].label,'&lt;img onerror=evil()&gt;');
 assert.equal(table.rows[0][0].v,'<span data-ccr-action-row="0">bad</span>');
 assert.match(table.rows[0][0].f,/^&lt;span/);
 assert.equal(f.mount.querySelector('[data-ccr-action-row]'),null);
 view.dispose();f.dom.window.close();
});
