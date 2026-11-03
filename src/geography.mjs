// The renderer receives public geography from its host. No datasets or remote
// provider URLs are bundled, and importing CCR never downloads anything.
const brazil={states:[],cities:[],municipalities:[],regions:[]},world={countries:[]};
export const geographicBase=brazil;
export const worldBase=world;
let loader=null,activeKey=null;
const pending=new Map(),loaded=new Map();
export function configureGeography({load}={}){if(load!==undefined&&typeof load!=='function')throw Error('geography_loader_invalid');loader=load||null;}
export function installGeography(data){
 if(!data||!Array.isArray(data.states)||!Array.isArray(data.cities)||!Array.isArray(data.countries))throw Error('geography_data_invalid');
 Object.assign(brazil,data);Object.assign(world,{countries:data.countries,attribution:data.attribution,obtainedAt:data.obtainedAt});index=null;activeKey=data.key||'injected';
}
export function geographyKey(value){
 const labels=value.columns.map(c=>normalizePlace(typeof c==='string'?c:c.label));
 const find=names=>labels.findIndex(n=>names.includes(n));
 const country=find(['pais','country','country code']),continent=find(['continente','continent']);
 const city=find(['cidade','cidade/uf','city','municipio','municipality']);
 const localBrazil=country>=0&&value.rows.every(r=>['br','bra','brasil','brazil'].includes(normalizePlace(r[country])));
 const slug=s=>normalizePlace(s).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
 if(continent>=0){const names=[...new Set(value.rows.map(r=>slug(r[continent])))];return names.length===1?'continent-'+names[0]:'world';}
 if(country>=0&&!(localBrazil&&(city>=0||find(['uf','estado','state'])>=0))){const names=[...new Set(value.rows.map(r=>slug(r[country])))];return names.length===1?'country-name-'+names[0]:'world';}
 const neighborhood=find(['bairro','neighborhood']),municipality=find(['codigo municipio','ibge municipio','municipality code','ibge']);
 if(neighborhood>=0&&municipality>=0){const ids=[...new Set(value.rows.map(r=>String(r[municipality])))];if(ids.length===1&&/^\d{7}$/.test(ids[0]))return 'neighborhoods-'+ids[0];}
 const state=find(['uf','estado','state','state code']);
 const ufs=state<0?[]:[...new Set(value.rows.map(r=>String(r[state]||'').toUpperCase()).filter(Boolean))];
 if((city>=0||municipality>=0)&&ufs.length===1&&/^[A-Z]{2}$/.test(ufs[0]))return 'state-'+ufs[0];
 const lat=find(['lat','latitude']),lon=find(['lon','lng','longitude']);
 if(lat>=0&&lon>=0&&value.rows.some(r=>typeof r[lon]==='number'&&(r[lon]<-75||r[lon]>-32||r[lat]<-34||r[lat]>6)))return 'world';
 return 'brazil';
}
export function geographyReady(value){return activeKey==='injected'||activeKey===geographyKey(value);}
export async function ensureGeography(value){
 const key=geographyKey(value);
 if(!loader)throw Error('Fonte geográfica do host não configurada.');
 if(!loaded.has(key)){
  if(!pending.has(key))pending.set(key,Promise.resolve().then(()=>loader(key)).then(data=>{loaded.set(key,data);if(loaded.size>8)loaded.delete(loaded.keys().next().value);return data;}).finally(()=>pending.delete(key)));
  await pending.get(key);
 }
 let data=loaded.get(key);
 if(key==='brazil'){
  const labels=value.columns.map(c=>normalizePlace(typeof c==='string'?c:c.label)),city=labels.findIndex(c=>['cidade','cidade/uf','city','municipio','municipality'].includes(c)),uf=labels.findIndex(c=>['uf','estado','state'].includes(c)),code=labels.findIndex(c=>['codigo municipio','ibge municipio','municipality code','ibge'].includes(c));
  if(city>=0||code>=0){
   installGeography(data);
   const states=[...new Set(value.rows.map(r=>{const place=resolvePlace(code>=0?r[code]:r[city],{state:uf>=0?r[uf]:null,kind:code>=0?'municipality-code':'city'});return place.status==='ready'?place.state?.uf:null;}).filter(Boolean))];
   if(states.length){
    const parts=await Promise.all(states.map(state=>{const k='state-'+state;if(!pending.has(k)&&!loaded.has(k))pending.set(k,Promise.resolve().then(()=>loader(k)).then(d=>{loaded.set(k,d);return d;}).finally(()=>pending.delete(k)));return loaded.has(k)?loaded.get(k):pending.get(k);}));
    data={...data,states:parts.flatMap(p=>p.states),cities:parts.flatMap(p=>p.cities),municipalities:parts.flatMap(p=>p.municipalities),regions:parts.flatMap(p=>p.regions)};
   }
  }
 }
 return data;
}
export const normalizePlace=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[’']/g,'').replace(/\s+/g,' ').trim();
let index;
function places(){
 if(index)return index;
 const states=new Map(),cities=new Map(),cityCodes=new Map(),countries=new Map(),continents=new Map();
 for(const state of brazil.states){states.set(normalizePlace(state.uf),state);states.set(normalizePlace(state.name),state);}
 for(const city of brazil.cities){const key=normalizePlace(city[0]),items=cities.get(key)||[];items.push(city);cities.set(key,items);cityCodes.set(String(city[4]),city);}
 for(const country of world.countries){
  for(const key of [country.code,country.iso2,country.iso3,country.name,country.name_en].filter(Boolean)){const normalized=normalizePlace(key),items=countries.get(normalized)||[];if(!items.includes(country))items.push(country);countries.set(normalized,items);}
  const key=normalizePlace(country.continent),members=continents.get(key)||[];members.push(country);continents.set(key,members);
 }
 return index={states,cities,cityCodes,countries,continents};
}
export function resolvePlace(name,{state,kind='city'}={}){
 const lookup=places(),text=normalizePlace(name);
 if(!text)return {status:'missing'};
 if(kind==='neighborhood'){
  const matches=(brazil.regions||[]).filter(r=>r.level==='neighborhood'&&(normalizePlace(r.name)===text||String(r.code)===text));
  return matches.length===1?{status:'ready',kind:'region',region:matches[0],label:matches[0].name,latitude:matches[0].latitude,longitude:matches[0].longitude}:{status:matches.length?'ambiguous-city':'unknown-city'};
 }
 if(kind==='country'){
  if(!world.countries.length&&['br','bra','brasil','brazil'].includes(text))return {status:'ready',kind:'country',country:{code:'BRA',name:'Brasil'}};
  const matches=lookup.countries.get(text)||[];
  return matches.length===1?{status:'ready',kind:'country',country:matches[0],label:matches[0].name,latitude:matches[0].latitude,longitude:matches[0].longitude}:{status:matches.length?'ambiguous-country':'unknown-country'};
 }
 if(kind==='continent'){
  const members=lookup.continents.get(text);return members?{status:'ready',kind:'continent',countries:members,label:members[0].continent}:{status:'unknown-continent'};
 }
 if(kind==='state'){
  const found=lookup.states.get(text);return found?{status:'ready',kind:'state',state:found,label:found.name+'/'+found.uf}:{status:'unknown-state'};
 }
 if(kind==='municipality-code'){
  const city=/^\d{7}$/.test(text)?lookup.cityCodes.get(text):null;
  if(!city)return {status:'unknown-city'};
  const uf=state?lookup.states.get(normalizePlace(state)):null;
  if(state&&!uf)return {status:'unknown-state'};
  if(uf&&uf.uf!==city[1])return {status:'conflicting-state'};
  return {status:'ready',kind:'city',label:city[0]+'/'+city[1],latitude:city[2],longitude:city[3],code:city[4],state:lookup.states.get(normalizePlace(city[1]))};
 }
 let cityName=text,uf=state?lookup.states.get(normalizePlace(state)):null;
 if(state&&!uf)return {status:'unknown-state'};
 const suffix=text.match(/^(.+?)\s*[/,–—-]\s*([a-z ]+)$/);
 if(suffix&&lookup.states.has(suffix[2])){
  const embedded=lookup.states.get(suffix[2]);
  if(uf&&uf.uf!==embedded.uf)return {status:'conflicting-state'};
  uf=embedded;cityName=suffix[1].trim();
 }
 const matches=(lookup.cities.get(cityName)||[]).filter(city=>!uf||city[1]===uf.uf);
 if(matches.length!==1)return {status:matches.length?'ambiguous-city':'unknown-city',candidates:matches.map(city=>city[1])};
 const city=matches[0];
 return {status:'ready',kind:'city',label:city[0]+'/'+city[1],latitude:city[2],longitude:city[3],code:city[4],state:lookup.states.get(normalizePlace(city[1]))};
}

export function mapLocations(value){
 const names=value.columns.map(column=>normalizePlace(typeof column==='string'?column:column.label));
 const lat=names.findIndex(n=>['lat','latitude'].includes(n)),lon=names.findIndex(n=>['lon','lng','longitude'].includes(n));
 const city=names.findIndex(n=>['cidade','cidade/uf','cidade / uf','city','municipio','municipality'].includes(n));
 const neighborhood=names.findIndex(n=>['bairro','neighborhood'].includes(n));
 const state=names.findIndex(n=>['uf','estado','state','state code'].includes(n));
 const country=names.findIndex(n=>['pais','country','country code'].includes(n)),continent=names.findIndex(n=>['continente','continent'].includes(n));
 const code=names.findIndex(n=>['codigo municipio','ibge municipio','municipality code','ibge'].includes(n));
 const label=city>=0?city:names.findIndex((_,i)=>i!==lat&&i!==lon&&i!==state&&i!==country&&i!==continent&&value.rows.some(row=>typeof row[i]==='string'));
 const metric=names.findIndex((n,i)=>i!==lat&&i!==lon&&i!==state&&i!==city&&!/\bid\b|codigo|code|ibge/.test(n)&&value.rows.some(row=>typeof row[i]==='number'&&Number.isFinite(row[i])));
 const locations=value.rows.map((row,rowIndex)=>{
  const identity={row,rowIndex,metric:metric>=0?row[metric]:null,metricLabel:metric>=0?String(typeof value.columns[metric]==='string'?value.columns[metric]:value.columns[metric].label):null};
  if(lat>=0&&lon>=0&&(row[lat]!==null||row[lon]!==null)){
   if(typeof row[lat]!=='number'||typeof row[lon]!=='number'||!Number.isFinite(row[lat])||!Number.isFinite(row[lon])||Math.abs(row[lat])>90||Math.abs(row[lon])>180)return {...identity,status:'invalid-coordinates'};
   return {...identity,status:'ready',kind:'coordinate',latitude:row[lat],longitude:row[lon],label:String(label>=0?row[label]??'Ponto '+(rowIndex+1):'Ponto '+(rowIndex+1))};
  }
  let result;
  if(neighborhood>=0)result=resolvePlace(row[neighborhood],{kind:'neighborhood'});
  else if(code>=0&&row[code]!==null&&row[code]!==undefined&&row[code]!=='')result=resolvePlace(row[code],{kind:'municipality-code',state:state>=0?row[state]:null});
  else if(city>=0||(state<0&&country<0&&continent<0&&label>=0)){
   const nation=country>=0&&row[country]?resolvePlace(row[country],{kind:'country'}):null;
   result=nation&&(nation.status!=='ready'||nation.country.code!=='BRA')?{status:'unsupported-city-country'}:resolvePlace(row[city>=0?city:label],{state:state>=0?row[state]:null});
  }else if(state>=0){
   const nation=country>=0&&row[country]?resolvePlace(row[country],{kind:'country'}):null;
   result=nation&&(nation.status!=='ready'||nation.country.code!=='BRA')?{status:'unsupported-state-country'}:resolvePlace(row[state],{kind:'state'});
  }else if(country>=0)result=resolvePlace(row[country],{kind:'country'});
  else if(continent>=0)result=resolvePlace(row[continent],{kind:'continent'});
  else result={status:'missing'};
  return {...identity,...result};
 });
 return {locations,metric};
}
