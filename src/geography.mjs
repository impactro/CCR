import brazil from './geography-brazil.json' with {type:'json'};
import world from './geography-world.json' with {type:'json'};

export const geographicBase=brazil;
export const worldBase=world;
export const normalizePlace=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[’']/g,'').replace(/\s+/g,' ').trim();
let index;
function places(){
 if(index)return index;
 const states=new Map(),cities=new Map(),countries=new Map(),continents=new Map();
 for(const state of brazil.states){states.set(normalizePlace(state.uf),state);states.set(normalizePlace(state.name),state);}
 for(const city of brazil.cities){const key=normalizePlace(city[0]),items=cities.get(key)||[];items.push(city);cities.set(key,items);}
 for(const country of world.countries){
  for(const key of [country.code,country.iso2,country.iso3,country.name,country.name_en].filter(Boolean)){const normalized=normalizePlace(key),items=countries.get(normalized)||[];if(!items.includes(country))items.push(country);countries.set(normalized,items);}
  const key=normalizePlace(country.continent),members=continents.get(key)||[];members.push(country);continents.set(key,members);
 }
 return index={states,cities,countries,continents};
}
export function resolvePlace(name,{state,kind='city'}={}){
 const lookup=places(),text=normalizePlace(name);
 if(!text)return {status:'missing'};
 if(kind==='country'){
  const matches=lookup.countries.get(text)||[];
  return matches.length===1?{status:'ready',kind:'country',country:matches[0],label:matches[0].name,latitude:matches[0].latitude,longitude:matches[0].longitude}:{status:matches.length?'ambiguous-country':'unknown-country'};
 }
 if(kind==='continent'){
  const members=lookup.continents.get(text);return members?{status:'ready',kind:'continent',countries:members,label:members[0].continent}:{status:'unknown-continent'};
 }
 if(kind==='state'){
  const found=lookup.states.get(text);return found?{status:'ready',kind:'state',state:found,label:found.name+'/'+found.uf}:{status:'unknown-state'};
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
 const state=names.findIndex(n=>['uf','estado','state','state code'].includes(n));
 const country=names.findIndex(n=>['pais','country','country code'].includes(n)),continent=names.findIndex(n=>['continente','continent'].includes(n));
 const label=city>=0?city:names.findIndex((_,i)=>i!==lat&&i!==lon&&i!==state&&i!==country&&i!==continent&&value.rows.some(row=>typeof row[i]==='string'));
 const metric=names.findIndex((n,i)=>i!==lat&&i!==lon&&i!==state&&i!==city&&!/\bid\b|codigo|code|ibge/.test(n)&&value.rows.some(row=>typeof row[i]==='number'&&Number.isFinite(row[i])));
 const locations=value.rows.map((row,rowIndex)=>{
  const identity={row,rowIndex,metric:metric>=0?row[metric]:null,metricLabel:metric>=0?String(typeof value.columns[metric]==='string'?value.columns[metric]:value.columns[metric].label):null};
  if(lat>=0&&lon>=0&&(row[lat]!==null||row[lon]!==null)){
   if(typeof row[lat]!=='number'||typeof row[lon]!=='number'||!Number.isFinite(row[lat])||!Number.isFinite(row[lon])||Math.abs(row[lat])>90||Math.abs(row[lon])>180)return {...identity,status:'invalid-coordinates'};
   return {...identity,status:'ready',kind:'coordinate',latitude:row[lat],longitude:row[lon],label:String(label>=0?row[label]??'Ponto '+(rowIndex+1):'Ponto '+(rowIndex+1))};
  }
  let result;
  if(city>=0||label>=0){
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
