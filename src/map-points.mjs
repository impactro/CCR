/** Trusted-host overlay data. No geocoding, transport or business entity schema. */
export function mapPoints(value=[]){
 if(!Array.isArray(value)||value.length>10000)throw TypeError('map_points_limit');
 const keys=new Set();
 return value.map((point,index)=>{
  if(!point||typeof point!=='object'||Array.isArray(point)
   ||Object.keys(point).some(k=>!['key','label','latitude','longitude','kind','code','count'].includes(k)))throw TypeError('map_point_invalid');
  if(![Object.prototype,null].includes(Object.getPrototypeOf(point))||Object.values(Object.getOwnPropertyDescriptors(point)).some(d=>!Object.hasOwn(d,'value')))throw TypeError('map_point_invalid');
  const {key,label,latitude,longitude,kind='coordinate',code=null,count=1}=point;
  if(typeof key!=='string'||!key||key.length>160||keys.has(key)||typeof label!=='string'||!label||label.length>240
   ||typeof latitude!=='number'||!Number.isFinite(latitude)||Math.abs(latitude)>90
   ||typeof longitude!=='number'||!Number.isFinite(longitude)||Math.abs(longitude)>180
   ||!['coordinate','municipal-reference'].includes(kind)||(code!==null&&(typeof code!=='string'||!/^\d{7}$/.test(code)))
   ||!Number.isInteger(count)||count<1||count>10000)throw TypeError('map_point_invalid');
  keys.add(key);
  return {overlay:true,status:'ready',kind,pointKey:key,rowIndex:index,label,latitude,longitude,code,metric:count,metricLabel:'Quantidade'};
 });
}
