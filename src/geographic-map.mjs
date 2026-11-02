import {createDataTable} from './data.js';
import {geographicBase,worldBase,mapLocations,geographyReady,ensureGeography,installGeography} from './geography.mjs';

const NS='http://www.w3.org/2000/svg',W=800,H=540,LIMIT=500;
const mercator=latitude=>Math.log(Math.tan(Math.PI/4+Math.max(-85,Math.min(85,latitude))*Math.PI/360))*180/Math.PI;
const rings=geometry=>geometry.type==='Polygon'?geometry.coordinates:geometry.coordinates.flat();
const reasons={'missing':'localidade ausente','unknown-state':'estado não encontrado','conflicting-state':'UF conflitante','ambiguous-city':'cidade homônima: informe UF','unknown-city':'cidade fora da base ou não encontrada','invalid-coordinates':'coordenadas inválidas','unknown-country':'país não encontrado','ambiguous-country':'nome de país ambíguo','unknown-continent':'continente não encontrado','unsupported-city-country':'cidade estrangeira fora do catálogo','unsupported-state-country':'estado estrangeiro fora do catálogo'};
const principalRing=geometry=>rings(geometry).reduce((largest,ring)=>{
 const area=r=>Math.abs(r.slice(1).reduce((s,p,i)=>s+r[i][0]*p[1]-p[0]*r[i][1],0));return area(ring)>area(largest)?ring:largest;
},[]);

/** Offline Brazilian cartography. The input remains an accessible typed table. */
export function createGeographicMap(document,value,{locale='pt-BR'}={}){
 if(!geographyReady(value)){
  const holder=document.createElement('div'),note=document.createElement('p');let disposed=false,inner=null;
  holder.className='chat-geo-loading';note.setAttribute('role','status');note.textContent='Preparando fronteiras geográficas do cache local…';holder.append(note,createDataTable(document,value,{locale}));
  ensureGeography(value).then(data=>{if(disposed)return;installGeography(data);inner=createGeographicMap(document,value,{locale});holder.replaceChildren(inner);}).catch(()=>{if(!disposed)note.textContent='Mapa indisponível no momento: não foi possível obter/validar as fronteiras. Dados preservados na tabela; revisar a fonte geográfica do host.';});
  Object.defineProperty(holder,'dispose',{value:()=>{disposed=true;inner?.dispose?.();}});return holder;
 }
 const figure=createDataTable(document,value,{locale});figure.classList.add('chat-geo-map');
 const {locations}=mapLocations(value),valid=locations.filter(p=>p.status==='ready'),shown=valid.slice(0,LIMIT),points=shown.filter(p=>p.kind==='coordinate'||p.kind==='city'&&!geographicBase.municipalities?.some(r=>r.code===p.code));
 const worldwide=shown.some(p=>['country','continent'].includes(p.kind))||points.some(p=>p.longitude< -75||p.longitude> -32||p.latitude< -34||p.latitude>6);
 const territories=worldwide?worldBase.countries:geographicBase.municipalities?.length?geographicBase.municipalities:geographicBase.regions?.length?geographicBase.regions:geographicBase.states;
 const numeric=shown.map(p=>p.metric).filter(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0),maximum=Math.max(0,...numeric);
 const make=(tag,attrs={},text)=>{const e=document.createElementNS(NS,tag);for(const [key,v]of Object.entries(attrs))e.setAttribute(key,String(v));if(text!==undefined)e.textContent=text;return e;};
 const svg=make('svg',{viewBox:`0 0 ${W} ${H}`,role:'group','aria-label':String(value.title||'Mapa geográfico'),tabindex:0});
 svg.classList.add('chat-geographic-canvas');svg.append(make('rect',{width:W,height:H,fill:'var(--ca-map-water,#dcebf3)'}));
 const viewport=make('g'),land=make('g'),markers=make('g');viewport.append(land,markers);svg.append(viewport);
 const coordinates=worldwide?[[-180,-60],[180,85]]:territories.flatMap(s=>rings(s.geometry).flat());
 const extent=coordinates,xs=extent.map(p=>p[0]),ys=extent.map(p=>mercator(p[1]));
 const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),scale=Math.min((W-48)/Math.max(1,maxX-minX),(H-48)/Math.max(1,maxY-minY));
 const project=(lon,lat)=>[(W-(maxX-minX)*scale)/2+(lon-minX)*scale,(H-(maxY-minY)*scale)/2+(maxY-mercator(lat))*scale];
 const details=document.createElement('div');details.className='chat-geographic-detail';details.setAttribute('role','status');details.setAttribute('aria-live','polite');details.textContent='Selecione um ponto ou território para ver os dados.';
 const fmt=new Intl.NumberFormat(locale,{maximumFractionDigits:6});
 const describe=p=>`${p.label}${p.metricLabel?' · '+p.metricLabel+': '+(p.metric===null?'Sem dado':typeof p.metric==='number'?fmt.format(p.metric):String(p.metric)):''}${p.kind==='city'?(geographicBase.municipalities?.some(r=>r.code===p.code)?' · limite municipal':' · referência municipal'):p.kind==='region'?' · limite oficial de bairro':p.kind==='coordinate'?' · coordenada fornecida':''}`;
 const active=[];let selected=null;
 function inspect(node,label,items){
  node.setAttribute('role','button');node.setAttribute('tabindex','0');node.setAttribute('aria-label',label);node.append(make('title',{},label));
  const show=()=>{if(selected)selected.removeAttribute('data-selected');selected=node;node.setAttribute('data-selected','true');details.textContent=items.map(describe).join(' | ')||label;};
  const key=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();show();}};
  node.addEventListener('click',show);node.addEventListener('keydown',key);active.push(()=>{node.removeEventListener('click',show);node.removeEventListener('keydown',key);});
 }
 const color=n=>`hsl(${220-Math.min(1,n/Math.max(1,maximum))*220} 70% 45%)`;
 let repeated=0;
 for(const state of territories){
  const matches=shown.filter(p=>worldwide?(p.kind==='country'&&p.country.code===state.code||p.kind==='continent'&&p.countries.some(c=>c.code===state.code)):(p.kind==='region'&&p.region.code===state.code||p.kind==='city'&&p.code===state.code||p.kind==='state'&&p.state.uf===state.uf));
  const quantities=matches.map(p=>p.metric).filter(n=>typeof n==='number'&&n>=0&&Number.isFinite(n));if(matches.length>1)repeated++;
  const d=rings(state.geometry).map(ring=>ring.map(([lon,lat],i)=>{const[x,y]=project(lon,lat);return(i?'L':'M')+x.toFixed(2)+' '+y.toFixed(2);}).join(' ')+'Z').join(' ');
  const path=make('path',{d,'fill-rule':'evenodd',fill:matches.length?(matches.length===1&&quantities.length?color(quantities[0]):'var(--ca-map-highlight,#69bcb0)'):'var(--ca-map-land,#edf2e8)',stroke:'var(--ca-map-border,#748478)','stroke-width':.8,'vector-effect':'non-scaling-stroke',[worldwide?'data-country':'data-uf']:worldwide?state.code:state.uf});
  inspect(path,state.name+' · '+(state.region||state.continent),matches);land.append(path);
 }
 for(const point of points){
  const[x,y]=project(point.longitude,point.latitude),radius=typeof point.metric==='number'&&point.metric>0&&maximum>0?Math.max(3,16*Math.sqrt(point.metric/maximum)):4;
  const group=make('g',{'data-location-kind':point.kind,'data-row':point.rowIndex}),dot=make('circle',{cx:x,cy:y,r:radius,'data-radius':radius,fill:typeof point.metric==='number'&&point.metric>=0?color(point.metric):'var(--ca-map-highlight,#69bcb0)',stroke:'var(--ca-map-point-border,#163f4d)','stroke-width':1.5,'vector-effect':'non-scaling-stroke'});
  group.append(dot);
  if(typeof point.metric==='number'&&point.metric>0)group.append(make('text',{x,y,dy:'.35em','text-anchor':'middle','font-size':11,fill:'#fff','pointer-events':'none','aria-hidden':'true'},fmt.format(point.metric)));
  inspect(group,describe(point),[point]);markers.append(group);
 }
 let zoom=1,dx=0,dy=0,drag=null,disposed=false;
 const repaint=()=>{viewport.setAttribute('transform',`translate(${W/2+dx} ${H/2+dy}) scale(${zoom}) translate(${-W/2} ${-H/2})`);for(const dot of markers.querySelectorAll('circle'))dot.setAttribute('r',Number(dot.dataset.radius)/zoom);for(const text of markers.querySelectorAll('text'))text.setAttribute('font-size',11/zoom);};
 const change=factor=>{zoom=Math.max(1,Math.min(64,zoom*factor));if(zoom===1){dx=dy=0;}repaint();};
 function fit(){
  let focus=[];
  const states=[...new Map(shown.filter(p=>p.state).map(p=>[p.state.uf,p.state])).values()];
  if(!worldwide&&states.length===1)focus=rings(states[0].geometry).flat();
  else if(shown.some(p=>p.kind==='continent'))focus=shown.filter(p=>p.kind==='continent').flatMap(p=>p.countries.flatMap(c=>principalRing(c.geometry)));
  else if(shown.some(p=>p.kind==='country'))focus=shown.filter(p=>p.kind==='country').flatMap(p=>principalRing(p.country.geometry));
  else focus=[...points.map(p=>[p.longitude,p.latitude]),...states.flatMap(s=>rings(s.geometry).flat())];
  if(!focus.length){zoom=1;dx=dy=0;repaint();return;}
  const projected=focus.map(p=>project(...p));let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;
  for(const[x,y]of projected){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
  zoom=Math.max(1,Math.min(64,(W-100)/Math.max(40,right-left),(H-100)/Math.max(40,bottom-top)));dx=(W/2-(left+right)/2)*zoom;dy=(H/2-(top+bottom)/2)*zoom;repaint();
 }
 const controls=document.createElement('div');controls.className='chat-geographic-controls';controls.setAttribute('role','group');controls.setAttribute('aria-label','Navegação do mapa');
 function button(label,text,action){const b=document.createElement('button');b.type='button';b.textContent=text;b.setAttribute('aria-label',label);b.addEventListener('click',action);active.push(()=>b.removeEventListener('click',action));controls.append(b);}
 button('Ampliar mapa','+',()=>change(1.5));button('Reduzir mapa','−',()=>change(1/1.5));button('Enquadrar os dados','Enquadrar',fit);button('Reenquadrar mapa',worldwide?'Mundo':'Brasil',()=>{zoom=1;dx=dy=0;repaint();});
 for(const[label,text,x,y]of[['Mover mapa para esquerda','←',60,0],['Mover mapa para direita','→',-60,0],['Mover mapa para cima','↑',0,60],['Mover mapa para baixo','↓',0,-60]])button(label,text,()=>{dx+=x;dy+=y;repaint();});
 const onKey=e=>{if(e.target!==svg)return;const pan={ArrowLeft:[60,0],ArrowRight:[-60,0],ArrowUp:[0,60],ArrowDown:[0,-60]};if(pan[e.key]){e.preventDefault();dx+=pan[e.key][0];dy+=pan[e.key][1];repaint();}else if(['+','=','-','Home'].includes(e.key)){e.preventDefault();if(e.key==='Home'){zoom=1;dx=dy=0;repaint();}else change(e.key==='-'?1/1.5:1.5);}};
 const down=e=>{if(e.button!==0||e.target.closest('[role="button"]'))return;drag={x:e.clientX,y:e.clientY,dx,dy};svg.setPointerCapture?.(e.pointerId);};
 const move=e=>{if(!drag)return;const rect=svg.getBoundingClientRect();if(!rect.width||!rect.height)return;dx=drag.dx+(e.clientX-drag.x)*W/rect.width;dy=drag.dy+(e.clientY-drag.y)*H/rect.height;repaint();};
 const up=()=>{drag=null;};
 svg.addEventListener('keydown',onKey);svg.addEventListener('pointerdown',down);svg.addEventListener('pointermove',move);svg.addEventListener('pointerup',up);svg.addEventListener('pointercancel',up);fit();
 const summary=document.createElement('p');summary.className='chat-geographic-summary';summary.textContent=`${shown.length} de ${locations.length} linhas no mapa${valid.length>LIMIT?'; limite visual de '+LIMIT:''}. ${worldwide?'Fronteiras de países/continentes.':geographicBase.municipalities?.length?'Fronteiras municipais.':territories.some(r=>r.level==='neighborhood')?'Fronteiras oficiais de bairros.':'Fronteiras das UFs/DF.'} ${numeric.length?'Cor azul→vermelho: 0→'+fmt.format(maximum)+'. GPS, quando fornecido, é sobreposto à base. ':''}Nulo/sem métrica: destaque neutro; sem linha: fundo claro. ${repeated?'Territórios com múltiplas linhas têm destaque neutro; agregue antes de comparar. ':''}Sem mapa de ruas.`;
 const unresolved=locations.filter(p=>p.status!=='ready');
 if(unresolved.length){const note=document.createElement('span');note.className='chat-geographic-unresolved';const counts=new Map();for(const p of unresolved){const reason=reasons[p.status]||'não localizado';counts.set(reason,(counts.get(reason)||0)+1);}note.textContent='Sem localização: '+[...counts].map(([r,n])=>`${n} ${r}`).join('; ')+'. Linhas preservadas na tabela.';summary.append(' ',note);}
 const attribution=document.createElement('p');attribution.className='chat-geographic-attribution';attribution.textContent=(worldwide?worldBase.attribution:geographicBase.attribution)+' · base obtida em '+geographicBase.obtainedAt+'. Referência geográfica ≠ GPS de cliente. Linhas não são somadas automaticamente. Projeção Mercator limitada a±85°.';
 figure.prepend(controls,svg,details,summary);figure.append(attribution);
 const dispose=()=>{if(disposed)return;disposed=true;drag=null;for(const stop of active)stop();svg.removeEventListener('keydown',onKey);svg.removeEventListener('pointerdown',down);svg.removeEventListener('pointermove',move);svg.removeEventListener('pointerup',up);svg.removeEventListener('pointercancel',up);};
 // A Node remains compatible with public createGeoMap; renderer lifecycles own cleanup.
 Object.defineProperty(figure,'dispose',{value:dispose});return figure;
}
