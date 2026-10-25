export function createDataTable(document, value, {locale='pt-BR'}={}) {
  if (!value || !Array.isArray(value.columns) || !Array.isArray(value.rows) || !value.columns.length || value.columns.length > 16 || value.rows.length > 1000) throw Error('Dados fora do limite');
  const columns = value.columns.map(c => typeof c === 'string' ? c : c?.label);
  if (columns.some(c => typeof c !== 'string' || c.length > 120)) throw Error('Coluna inválida');
  const wrap = document.createElement('figure'); wrap.className = 'chat-data';
  const title = document.createElement('figcaption'); title.textContent = String(value.title || 'Dados').slice(0, 180);
  const table = document.createElement('table'), head = document.createElement('thead'), tr = document.createElement('tr');
  for (const column of columns) { const th = document.createElement('th'); th.scope = 'col'; th.textContent = column; tr.append(th); }
  head.append(tr); table.append(head);
  const body = document.createElement('tbody');
  const number=new Intl.NumberFormat(locale,{maximumFractionDigits:6});
  for (const row of value.rows) {
    if (!Array.isArray(row) || row.length !== columns.length || row.some(v => v !== null && !(typeof v === 'string' && v.length <= 2000) && !(typeof v === 'number' && Number.isFinite(v)))) throw Error('Linha inválida');
    const line = document.createElement('tr');
    for (const value of row) { const td = document.createElement('td'); td.textContent = value === null ? 'Sem dado' : typeof value==='number'?number.format(value):value; line.append(td); }
    body.append(line);
  }
  table.append(body); wrap.append(title, table);
  const details=[value.source,value.period,value.note].filter(item=>typeof item==='string'&&item.trim()).map(item=>item.slice(0,800));
  if(details.length){const source=document.createElement('figcaption');source.className='chat-data-source';source.textContent=details.join(' · ');wrap.append(source);}
  return wrap;
}
