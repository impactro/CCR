export const DATA_TYPES=Object.freeze(['string','number','boolean','date','datetime','html']);
export const isIsoDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
export const isIsoDateTime=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(value)&&isIsoDate(value.slice(0,10))&&Number.isFinite(Date.parse(value));
const validCell=(value,type)=>value===null||(
 type==='number'?typeof value==='number'&&Number.isFinite(value):
 type==='boolean'?typeof value==='boolean':
 type==='date'?isIsoDate(value):type==='datetime'?isIsoDateTime(value):
 type==='string'||type==='html'?typeof value==='string'&&value.length<=2000:
 typeof value==='string'&&value.length<=2000||typeof value==='number'&&Number.isFinite(value)
);

/** Preserve values/types. Untyped columns keep the original text/number/null API. */
export function validateTable(value,{typed=false}={}){
 if(!value||!Array.isArray(value.columns)||!value.columns.length||value.columns.length>16||!Array.isArray(value.rows)||value.rows.length>1000)throw Error('invalid_data');
 const labels=new Set();
 const columns=value.columns.map(column=>{
  const label=typeof column==='string'?column:column?.label,type=typeof column==='object'&&column!==null?column.type:undefined;
  if(typeof label!=='string'||!label.trim()||label.length>120||type!==undefined&&!DATA_TYPES.includes(type)||typed&&(!type||labels.has(label.toLowerCase())))throw Error('invalid_column');
  labels.add(label.toLowerCase());return type?{label,type}:{label};
 });
 const rows=value.rows.map(row=>{
  if(!Array.isArray(row)||row.length!==columns.length||row.some((cell,i)=>!validCell(cell,columns[i].type)))throw Error('invalid_cell');
  return [...row];
 });
 return {columns,rows};
}
