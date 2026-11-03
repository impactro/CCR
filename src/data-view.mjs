import {renderChatMessage,bindConversationInteractions} from './conversation.mjs';
import {actionIcon} from './actions.mjs';
/** Rich data implementation shared by chats and miniapps. Host owns exports/actions. */
export function createRichDataRenderer({document=globalThis.document,google=false,loadCharts,exportData,onError=()=>{},locale='pt-BR'}={}) {
  if (!document?.defaultView) throw new TypeError('A DOM document is required');
  const window=document.defaultView, mounts=new WeakMap();
  const GOOGLE_LOADER = "https://www.gstatic.com/charts/loader.js";
  const GOOGLE_PACKAGES = [
    "calendar",
    "corechart",
    "gauge",
    "orgchart",
    "sankey",
    "table",
    "timeline",
    "treemap",
  ];
  const VIEW_LABELS = {
    table: "Tabela",
    pie: "Pizza",
    donut: "Rosca",
    bar: "Barras",
    column: "Colunas",
    "stacked-bar": "Barras empilhadas",
    "stacked-column": "Colunas empilhadas",
    line: "Linhas",
    area: "Área",
    combo: "Combinado",
    scatter: "Dispersão",
    histogram: "Histograma",
    org: "Organograma",
    timeline: "Timeline",
    calendar: "Calendário",
    gauge: "Indicadores",
    candlestick: "Candlestick",
    sankey: "Sankey",
    treemap: "Treemap",
    bubble: "Bolhas",
  };
  const COLORS = [
    "#24704a",
    "#3978a8",
    "#ad7415",
    "#9a3f52",
    "#7252a3",
    "#2b7a78",
    "#6d5d4b",
  ];
  const SAFE_HTML_TAGS = new Set([
    "A", "B", "BR", "CODE", "EM", "I", "IMG", "SMALL", "SPAN", "STRONG",
  ]);
  const DROP_HTML_TAGS = new Set([
    "IFRAME", "OBJECT", "SCRIPT", "STYLE", "SVG",
  ]);
  let chartsReady = null;

  function report(state,error){
    if(state.disposed)return;
    state.error.textContent=error?.message||'Não foi possível exibir os dados.';
    try{onError(error);}catch{}
  }
  function pageSize(state){return Math.max(1,Math.min(500,Math.floor(Number(state.options.pageSize)||10)));}
  function cellText(state,value,column,index){
    const formatter=state.options.formatters?.[index];
    if(formatter!==undefined&&typeof formatter!=='function')throw new TypeError('Formatador inválido.');
    if(formatter)return String(formatter(value));
    if(value!==null&&['date','datetime'].includes(column.type)){
      const date=googleValue(value,column.type);
      if(date instanceof Date&&!Number.isNaN(date.valueOf()))return column.type==='date'?date.toLocaleDateString(locale):date.toLocaleString(locale);
    }
    return displayCellValue(value,column.type);
  }
  function validateActions(columns){
    if(!Array.isArray(columns)||columns.length>8)throw new TypeError('Colunas de ação inválidas.');
    for(const column of columns)if(!column||typeof column.label!=='string'||column.label.length>120||typeof column.actions!=='function')throw new TypeError('Ações exigem um callback do aplicativo.');
    return columns;
  }
  function rowInfo(state,index){
    const row=Object.freeze([...state.data.rows[index]]);
    return Object.freeze({row,index,key:typeof state.options.rowKey==='function'?state.options.rowKey(row,index):index});
  }
  function actionCell(state,index,columnIndex){
    const cell=document.createElement('div');cell.className='ccr-data-actions';
    const info=rowInfo(state,index),actions=state.actionColumns[columnIndex].actions(info);
    if(!Array.isArray(actions)||actions.length>12)throw new TypeError('Lista de ações inválida.');
    for(const action of actions){
      if(!action||typeof action.label!=='string'||action.label.length>120||typeof action.invoke!=='function')throw new TypeError('Ação inválida.');
      const button=document.createElement('button');button.type='button';button.textContent=action.label;
      button.className='ccr-row-action';if(typeof action.title==='string')button.title=action.title.slice(0,300);
      const disabled=action.disabled===true;button.disabled=disabled;button.dataset.disabled=String(disabled);
      button.addEventListener('click',async event=>{
        event.stopPropagation();if(state.disposed||button.disabled)return;
        button.disabled=true;
        try{await action.invoke(info);}catch(error){report(state,error);}
        finally{if(!state.disposed)button.disabled=disabled;}
      });
      cell.append(button);
    }
    return cell;
  }
  function addGoogleActions(state,table,rows){
    state.actionColumns.forEach((column,columnIndex)=>{
      table.addColumn('string',escapeTableText(column.label));
      rows.forEach((row,visibleIndex)=>table.setCell(visibleIndex,state.data.columns.length+columnIndex,
        `<span data-ccr-action-row="${state.rowIndexes.get(row)}" data-ccr-action-column="${columnIndex}"></span>`));
    });
  }
  function bindGoogleActions(state,host){
    for(const slot of host.querySelectorAll('[data-ccr-action-row]')){
      if(slot.dataset.bound==='true')continue;
      const index=Number(slot.dataset.ccrActionRow),column=Number(slot.dataset.ccrActionColumn);
      if(!Number.isInteger(index)||index<0||index>=state.data.rows.length||!Number.isInteger(column)||column<0||column>=state.actionColumns.length)continue;
      slot.dataset.bound='true';slot.replaceChildren(actionCell(state,index,column));
    }
  }
  function prepareFallback(state,sourceRows){
    const rows=[...sourceRows],sort=state.sort;
    if(sort)rows.sort((a,b)=>{
      const type=state.data.columns[sort.index].type;
      const x=googleValue(a[sort.index],type),y=googleValue(b[sort.index],type);
      const compare=x===y?0:x==null?1:y==null?-1:typeof x==='number'&&typeof y==='number'?x-y:x instanceof Date&&y instanceof Date?x-y:String(x).localeCompare(String(y),'pt-BR',{numeric:true});
      return compare*(sort.desc?-1:1);
    });
    const size=state.options.pagination===false?Math.max(1,rows.length):pageSize(state);
    const pages=Math.max(1,Math.ceil(rows.length/size));state.page=Math.max(0,Math.min(state.page,pages-1));
    const table=state.fallback;table.replaceChildren();
    const thead=document.createElement('thead'),head=document.createElement('tr');
    state.data.columns.forEach((column,index)=>{
      const th=document.createElement('th');th.scope='col';
      const button=document.createElement('button');button.type='button';button.textContent=column.label;
      button.className='ccr-sort';button.title='Ordenar por '+column.label;
      if(sort?.index===index)th.setAttribute('aria-sort',sort.desc?'descending':'ascending');
      button.addEventListener('click',()=>{if(state.disposed)return;state.sort={index,desc:sort?.index===index?!sort.desc:false};state.page=0;state.ready=drawState(state);});
      th.append(button);head.append(th);
    });
    for(const column of state.actionColumns){const th=document.createElement('th');th.scope='col';th.textContent=column.label;head.append(th);}
    thead.append(head);const tbody=document.createElement('tbody');
    for(const row of rows.slice(state.page*size,(state.page+1)*size)){
      const tr=document.createElement('tr');
      row.forEach((value,index)=>{const td=document.createElement('td');td.textContent=cellText(state,value,state.data.columns[index],index);td.dataset.type=state.data.columns[index].type;tr.append(td);});
      state.actionColumns.forEach((column,columnIndex)=>{const td=document.createElement('td');td.append(actionCell(state,state.rowIndexes.get(row),columnIndex));tr.append(td);});
      tbody.append(tr);
    }
    table.append(thead,tbody);
    state.fallbackPager?.remove();const pager=document.createElement('div');pager.className='ccr-data-pager';state.fallbackPager=pager;table.after(pager);
    if(pages>1){
      const label=document.createElement('span');label.textContent=`${state.page+1} / ${pages}`;
      const previous=actionButton('Anterior','Página anterior'),next=actionButton('Próxima','Próxima página');
      previous.disabled=state.page===0;next.disabled=state.page===pages-1;
      previous.dataset.disabled=String(previous.disabled);next.dataset.disabled=String(next.disabled);
      previous.addEventListener('click',()=>{if(state.disposed)return;state.page--;state.ready=drawState(state);});
      next.addEventListener('click',()=>{if(state.disposed)return;state.page++;state.ready=drawState(state);});
      pager.append(previous,label,next);
    }
  }

  async function waitForChart(promise, signal) {
    if (signal?.aborted) throw new DOMException('Conversa encerrada.', 'AbortError');
    if (!signal) return promise;
    let abort;
    try {
      return await Promise.race([promise, new Promise((_, reject) => {
        abort = () => reject(new DOMException('Conversa encerrada.', 'AbortError'));
        signal.addEventListener('abort', abort, { once: true });
      })]);
    } finally { signal.removeEventListener('abort', abort); }
  }

  function loadGoogleCharts() {
    if (typeof loadCharts === 'function') return Promise.resolve(loadCharts({window,packages:[...GOOGLE_PACKAGES]}));
    if (google !== true) return Promise.reject(new Error('Google Charts não habilitado pelo aplicativo.'));
    if (chartsReady) return chartsReady;
    chartsReady = new Promise((resolve, reject) => {
      const start = () => {
        window.google.charts.load("current", { packages: GOOGLE_PACKAGES, language: locale });
        window.google.charts.setOnLoadCallback(resolve);
      };
      if (window.google?.charts) {
        start();
        return;
      }
      const script = document.createElement("script");
      script.src = GOOGLE_LOADER;
      script.async = true;
      script.addEventListener("load", start);
      script.addEventListener("error", () => reject(
        new Error("Não foi possível carregar o Google Charts."),
      ));
      document.head.append(script);
    });
    return chartsReady;
  }

  function parseNumber(value) {
    let text = String(value == null ? "" : value)
      .replace(/\u00a0/g, " ")
      .replace(/[^\d,.\-+]/g, "")
      .trim();
    if (!text || !/\d/.test(text)) return null;
    const comma = text.lastIndexOf(",");
    const dot = text.lastIndexOf(".");
    if (comma < 0 && /^[+-]?\d{1,3}(?:\.\d{3})+$/.test(text)) {
      text = text.replace(/\./g, "");
    } else if (comma > dot) {
      text = text.replace(/\./g, "").replace(",", ".");
    } else if (dot > comma && comma >= 0) {
      text = text.replace(/,/g, "");
    }
    const number = Number(text);
    return Number.isFinite(number) ? number : null;
  }

  function isSafeLink(value) {
    const link = String(value || "").trim();
    return /^(?:https:\/\/|mailto:|\/(?!\/)|#)/i.test(link);
  }

  function isSafeImage(value) {
    const source = String(value || "").trim();
    return /^(?:\/(?:api\/files|static)\/|data:image\/(?:png|jpeg|gif|webp);base64,)/i.test(source);
  }

  function sanitizeCellHtml(value) {
    const template = document.createElement("template");
    template.innerHTML = String(value == null ? "" : value);
    for (const element of [...template.content.querySelectorAll("*")]) {
      if (!template.content.contains(element)) continue;
      if (DROP_HTML_TAGS.has(element.tagName)) {
        element.remove();
        continue;
      }
      if (!SAFE_HTML_TAGS.has(element.tagName)) {
        element.replaceWith(document.createTextNode(element.textContent || ""));
        continue;
      }
      const attributes = [...element.attributes];
      for (const attribute of attributes) element.removeAttribute(attribute.name);
      if (element.tagName === "A") {
        const href = attributes.find(attribute => attribute.name.toLowerCase() === "href")?.value;
        if (isSafeLink(href)) {
          element.href = href;
          element.target = "_blank";
          element.rel = "noopener noreferrer";
        }
      }
      if (element.tagName === "IMG") {
        const source = attributes.find(attribute => attribute.name.toLowerCase() === "src")?.value;
        if (!isSafeImage(source)) {
          element.replaceWith(document.createTextNode(
            attributes.find(attribute => attribute.name.toLowerCase() === "alt")?.value || "",
          ));
          continue;
        }
        element.src = source;
        element.alt = attributes.find(
          attribute => attribute.name.toLowerCase() === "alt",
        )?.value || "";
        element.loading = "lazy";
        for (const name of ["width", "height"]) {
          const raw = attributes.find(
            attribute => attribute.name.toLowerCase() === name,
          )?.value;
          const size = Number.parseInt(raw, 10);
          if (Number.isFinite(size)) element[name] = Math.max(1, Math.min(640, size));
        }
      }
      const title = attributes.find(
        attribute => attribute.name.toLowerCase() === "title",
      )?.value;
      if (title) element.title = title.slice(0, 300);
    }
    return template.innerHTML;
  }

  function htmlPlainText(value) {
    const template = document.createElement("template");
    template.innerHTML = sanitizeCellHtml(value);
    for (const lineBreak of template.content.querySelectorAll("br")) {
      lineBreak.replaceWith(document.createTextNode(" "));
    }
    for (const image of template.content.querySelectorAll("img")) {
      image.replaceWith(document.createTextNode(` ${image.alt || ""} `));
    }
    return template.content.textContent.replace(/\s+/g, " ").trim();
  }

  function plainCellValue(value, type) {
    if (value === null || value === undefined) return "";
    return type === "html" ? htmlPlainText(value) : String(value);
  }

  // Presentation only: keep raw numeric values for sorting, charts and exports.
  function displayCellValue(value, type) {
    if (type === "number" && typeof value === "number" && Number.isFinite(value)) {
      return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 20 }).format(value);
    }
    return plainCellValue(value, type);
  }

  function inferColumn(values) {
    const useful = values.filter(value => String(value == null ? "" : value).trim() !== "");
    if (!useful.length) return { type: "string", values: values.map(String) };
    if (useful.every(value => /^\d{4}-\d{2}-\d{2}$/.test(String(value).trim()))) {
      return { type: "date", values: values.map(value => String(value).trim()) };
    }
    if (useful.every(value => Number.isFinite(Date.parse(String(value))))) {
      return { type: "datetime", values: values.map(value => String(value).trim()) };
    }
    const numbers = values.map(parseNumber);
    if (numbers.filter(value => value !== null).length >= Math.ceil(useful.length * 0.8)) {
      return { type: "number", values: numbers };
    }
    const booleans = useful.map(value => String(value).trim().toLocaleLowerCase("pt-BR"));
    if (booleans.every(value => ["true", "false", "sim", "não", "nao"].includes(value))) {
      return {
        type: "boolean",
        values: values.map(value => ["true", "sim"].includes(
          String(value).trim().toLocaleLowerCase("pt-BR"),
        )),
      };
    }
    return {
      type: "string",
      values: values.map(value => String(value == null ? "" : value)),
    };
  }

  function tableModel(table) {
    const rows = Array.from(table.rows);
    if (rows.length < 2) return null;
    const headers = Array.from(rows[0].cells, cell => cell.textContent.trim());
    if (!headers.length || headers.some(label => !label)) return null;
    const body = rows.slice(1)
      .map(row => Array.from(row.cells, cell => cell.textContent.trim()))
      .filter(row => row.length === headers.length);
    if (!body.length) return null;
    const inferred = headers.map((_, index) => inferColumn(body.map(row => row[index])));
    return {
      type: "data",
      title: "Tabela",
      columns: headers.map((label, index) => ({ label, type: inferred[index].type })),
      rows: body.map((_, rowIndex) =>
        headers.map((__, columnIndex) => inferred[columnIndex].values[rowIndex]),
      ),
    };
  }

  function normalizeDataItem(value) {
    if (!value || typeof value !== 'object' || !Array.isArray(value.columns) || !value.columns.length
        || value.columns.length>50 || !Array.isArray(value.rows) || value.rows.length>10000) throw new TypeError('Conjunto de dados inválido.');
    const labels=new Set(),types=new Set(['string','number','boolean','date','datetime','html']);
    const columns=value.columns.map((input,index)=>{
      const values=value.rows.map(r=>r?.[index]).filter(v=>v!==null);
      const inferred=values.length&&values.every(v=>typeof v==='number')?'number':values.length&&values.every(v=>typeof v==='boolean')?'boolean':'string';
      const c=typeof input==='string'?{label:input,type:inferred}:input;
      if(!c||typeof c.label!=='string'||!c.label.trim()||c.label.length>120||labels.has(c.label)||!types.has(c.type||'string'))throw new TypeError('Coluna inválida.');
      labels.add(c.label);return {label:c.label,type:c.type||'string'};
    });
    const rows=value.rows.map(row=>{
      if(!Array.isArray(row)||row.length!==columns.length||row.some(v=>v!==null&&!(typeof v==='string'&&v.length<=2000)&&!(typeof v==='number'&&Number.isFinite(v))&&typeof v!=='boolean'))throw new TypeError('Linha inválida.');
      return [...row];
    });
    return {type:'data',title:String(value.title||'Dados').slice(0,180),columns,rows,
      ...Object.fromEntries(['source','period','note'].filter(k=>typeof value[k]==='string').map(k=>[k,value[k].slice(0,800)]))};
  }

  function displayDataTitle(title) {
    return String(title || "Dados")
      .replace(/\s*(?:[-–—|]\s*)?p[aá]gina\s+\d+\s+de\s+\d+\s*$/i, "")
      .trim() || "Dados";
  }

  function columnIndexes(data, type) {
    return data.columns
      .map((column, index) => column.type === type ? index : -1)
      .filter(index => index >= 0);
  }

  function temporalIndexes(data) {
    return data.columns
      .map((column, index) => ["date", "datetime"].includes(column.type) ? index : -1)
      .filter(index => index >= 0);
  }

  function isHierarchy(data, idIndex, parentIndex) {
    const ids = data.rows
      .map(row => String(row[idIndex] == null ? "" : row[idIndex]).trim())
      .filter(Boolean);
    if (!ids.length || new Set(ids).size !== ids.length) return false;
    const known = new Set(ids);
    let roots = 0;
    for (const row of data.rows) {
      const parent = String(
        row[parentIndex] == null ? "" : row[parentIndex],
      ).trim();
      if (!parent) {
        roots += 1;
      } else if (!known.has(parent)) {
        return false;
      }
    }
    return roots >= 1;
  }

  function compatibleViews(data) {
    const strings = columnIndexes(data, "string");
    const numbers = columnIndexes(data, "number");
    const temporal = temporalIndexes(data);
    const categoryCount = strings.length + temporal.length;
    const views = ["table"];
    if (
      (categoryCount >= 1 && numbers.length >= 1)
      || numbers.length >= 2
    ) {
      views.push(
        "pie",
        "donut",
        "bar",
        "column",
        "stacked-bar",
        "stacked-column",
        "line",
        "area",
        "combo",
      );
    }
    if (categoryCount >= 1 && numbers.length >= 1) views.push("gauge");
    if (numbers.length >= 1) views.push("histogram");
    if (numbers.length >= 2) views.push("scatter");
    const hierarchy = strings.length >= 2
      && isHierarchy(data, strings[0], strings[1]);
    if (hierarchy) views.push("org");
    if (strings.length >= 1 && temporal.length >= 2) views.push("timeline");
    if (temporal.length >= 1 && numbers.length >= 1) views.push("calendar");
    if (categoryCount >= 1 && numbers.length >= 4) views.push("candlestick");
    if (strings.length >= 2 && numbers.length >= 1) views.push("sankey");
    if (hierarchy && numbers.length >= 1) views.push("treemap");
    if (strings.length >= 2 && numbers.length >= 3) views.push("bubble");
    return [...new Set(views)];
  }

  function googleType(type) {
    if (type === "date") return "date";
    if (type === "datetime") return "datetime";
    if (type === "number") return "number";
    if (type === "boolean") return "boolean";
    return "string";
  }

  function googleValue(value, type) {
    if (value === null || value === undefined || value === "") return null;
    if (type === "date") {
      const [year, month, day] = String(value).split("-").map(Number);
      return new Date(year, month - 1, day);
    }
    if (type === "datetime") return new Date(String(value));
    return value;
  }

  function selectedRows(data, query) {
    const normalized = String(query || "").trim().toLocaleLowerCase("pt-BR");
    if (!normalized) return data.rows;
    return data.rows.filter(row => row.some((value, index) =>
      plainCellValue(value, data.columns[index].type)
        .toLocaleLowerCase("pt-BR")
        .includes(normalized),
    ));
  }

  function escapeTableText(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function createDataTable(data, indexes, rows = data.rows, forceString = new Set(), formatNumbers = false) {
    const result = new window.google.visualization.DataTable();
    for (const index of indexes) {
      const column = data.columns[index];
      result.addColumn(
        forceString.has(index) ? "string" : googleType(column.type),
        formatNumbers?escapeTableText(column.label):column.label,
      );
    }
    result.addRows(rows.map(row => indexes.map(index => {
      const value = row[index];
      const columnType = data.columns[index].type;
      if (forceString.has(index)) return plainCellValue(value, columnType);
      if (columnType === "html") {
        return {
          v: htmlPlainText(value),
          f: sanitizeCellHtml(value),
        };
      }
      if (formatNumbers && columnType === "number" && typeof value === "number" && Number.isFinite(value)) {
        return { v: value, f: displayCellValue(value, columnType) };
      }
      if(formatNumbers&&columnType==='string'&&value!==null)return {v:String(value),f:escapeTableText(value)};
      return googleValue(value, columnType);
    })));
    return result;
  }

  function chartDefinition(view, data, rows) {
    const strings = columnIndexes(data, "string");
    const numbers = columnIndexes(data, "number");
    const temporal = temporalIndexes(data);
    const firstCategory = [...strings, ...temporal][0];
    const category = firstCategory === undefined ? numbers[0] : firstCategory;
    const standardIndexes = [category, ...numbers.filter(index => index !== category)];
    const forceCategory = new Set(
      data.columns[category]?.type === "number" ? [] : [category],
    );
    const commonOptions = {
      backgroundColor: "transparent",
      chartArea: { left: 70, top: 28, width: "76%", height: "68%" },
      colors: COLORS,
      height: 380,
      legend: { position: "bottom" },
      title: "",
    };
    if (view === "table") {
      return {
        Chart: window.google.visualization.Table,
        data: createDataTable(data, data.columns.map((_, index) => index), rows, new Set(), true),
        options: {
          alternatingRowStyle: true,
          allowHtml: true,
          page: "enable",
          pageSize: 10,
          pagingButtons: 5,
          showRowNumber: true,
          sort: "enable",
          width: "100%",
        },
      };
    }
    if (["pie", "donut"].includes(view)) {
      return {
        Chart: window.google.visualization.PieChart,
        data: createDataTable(data, [category, numbers[0]], rows, new Set([category])),
        options: { ...commonOptions, pieHole: view === "donut" ? 0.45 : 0 },
      };
    }
    if (["bar", "stacked-bar"].includes(view)) {
      return {
        Chart: window.google.visualization.BarChart,
        data: createDataTable(data, standardIndexes, rows, forceCategory),
        options: { ...commonOptions, isStacked: view === "stacked-bar" },
      };
    }
    if (["column", "stacked-column"].includes(view)) {
      return {
        Chart: window.google.visualization.ColumnChart,
        data: createDataTable(data, standardIndexes, rows, forceCategory),
        options: { ...commonOptions, isStacked: view === "stacked-column" },
      };
    }
    if (view === "line") {
      return {
        Chart: window.google.visualization.LineChart,
        data: createDataTable(data, standardIndexes, rows),
        options: commonOptions,
      };
    }
    if (view === "area") {
      return {
        Chart: window.google.visualization.AreaChart,
        data: createDataTable(data, standardIndexes, rows),
        options: commonOptions,
      };
    }
    if (view === "combo") {
      return {
        Chart: window.google.visualization.ComboChart,
        data: createDataTable(data, standardIndexes, rows, forceCategory),
        options: {
          ...commonOptions,
          seriesType: "bars",
          series: numbers.length > 1 ? { [numbers.length - 1]: { type: "line" } } : {},
        },
      };
    }
    if (view === "scatter") {
      return {
        Chart: window.google.visualization.ScatterChart,
        data: createDataTable(data, numbers, rows),
        options: commonOptions,
      };
    }
    if (view === "histogram") {
      return {
        Chart: window.google.visualization.Histogram,
        data: createDataTable(data, numbers, rows),
        options: commonOptions,
      };
    }
    if (view === "org") {
      const result = new window.google.visualization.DataTable();
      result.addColumn("string", data.columns[strings[0]].label);
      result.addColumn("string", data.columns[strings[1]].label);
      result.addColumn("string", "Detalhes");
      result.addRows(rows.map(row => [
        String(row[strings[0]] == null ? "" : row[strings[0]]),
        String(row[strings[1]] == null ? "" : row[strings[1]]),
        strings[2] === undefined || row[strings[2]] == null
          ? ""
          : String(row[strings[2]]),
      ]));
      return {
        Chart: window.google.visualization.OrgChart,
        data: result,
        options: { allowCollapse: true, allowHtml: false, size: "medium" },
      };
    }
    if (view === "timeline") {
      const result = new window.google.visualization.DataTable();
      result.addColumn({ type: "string", id: data.columns[strings[0]].label });
      result.addColumn({ type: "date", id: data.columns[temporal[0]].label });
      result.addColumn({ type: "date", id: data.columns[temporal[1]].label });
      result.addRows(rows.map(row => [
        String(row[strings[0]] == null ? "" : row[strings[0]]),
        googleValue(row[temporal[0]], data.columns[temporal[0]].type),
        googleValue(row[temporal[1]], data.columns[temporal[1]].type),
      ]));
      return {
        Chart: window.google.visualization.Timeline,
        data: result,
        options: { colors: COLORS, height: Math.max(220, rows.length * 42 + 70) },
      };
    }
    if (view === "calendar") {
      return {
        Chart: window.google.visualization.Calendar,
        data: createDataTable(data, [temporal[0], numbers[0]], rows),
        options: { calendar: { cellColor: { stroke: "#cbd2da" } }, height: 320 },
      };
    }
    if (view === "gauge") {
      return {
        Chart: window.google.visualization.Gauge,
        data: createDataTable(data, [category, numbers[0]], rows, new Set([category])),
        options: { height: 260, max: Math.max(...rows.map(row => Number(row[numbers[0]]) || 0), 100) },
      };
    }
    if (view === "candlestick") {
      return {
        Chart: window.google.visualization.CandlestickChart,
        data: createDataTable(
          data,
          [category, ...numbers.slice(0, 4)],
          rows,
          new Set([category]),
        ),
        options: commonOptions,
      };
    }
    if (view === "sankey") {
      return {
        Chart: window.google.visualization.Sankey,
        data: createDataTable(data, [strings[0], strings[1], numbers[0]], rows),
        options: { height: Math.max(300, rows.length * 28), sankey: { node: { colors: COLORS } } },
      };
    }
    if (view === "treemap") {
      const colorIndex = numbers[1] === undefined ? numbers[0] : numbers[1];
      const indexes = [strings[0], strings[1], numbers[0], colorIndex];
      return {
        Chart: window.google.visualization.TreeMap,
        data: createDataTable(data, indexes, rows),
        options: {
          height: 380,
          maxColor: "#24704a",
          midColor: "#f2c14e",
          minColor: "#9a3f52",
          showScale: true,
        },
      };
    }
    if (view === "bubble") {
      return {
        Chart: window.google.visualization.BubbleChart,
        data: createDataTable(
          data,
          [strings[0], numbers[0], numbers[1], strings[1], numbers[2]],
          rows,
        ),
        options: commonOptions,
      };
    }
    throw new Error("Visualização não implementada.");
  }

  function createNativeTable(data) {
    const table = document.createElement("table");
    table.className = "data-fallback-table";
    const head = document.createElement("thead");
    const headerRow = document.createElement("tr");
    for (const column of data.columns) {
      const cell = document.createElement("th");
      cell.textContent = column.label;
      headerRow.append(cell);
    }
    head.append(headerRow);
    const body = document.createElement("tbody");
    for (const row of data.rows) {
      const tableRow = document.createElement("tr");
      for (const [index, value] of row.entries()) {
        const cell = document.createElement("td");
        cell.textContent = displayCellValue(value, data.columns[index].type);
        if (data.columns[index].type === "number") cell.classList.add("data-cell-number");
        tableRow.append(cell);
      }
      body.append(tableRow);
    }
    table.append(head, body);
    return table;
  }

  function dataAsTsv(data) {
    return [
      data.columns.map(column => column.label).join("\t"),
      ...data.rows.map(row => row.map(
        (value, index) => plainCellValue(value, data.columns[index].type),
      ).join("\t")),
    ].join("\n");
  }

  function actionButton(label, title) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "message-action";
    button.textContent = label;
    button.title = title;
    button.setAttribute('aria-label',label);
    const icon=label==='PDF'?'pdf':label==='Excel'?'spreadsheet':null;
    if(icon){button.innerHTML=actionIcon(icon);button.classList.add('data-export-icon');}
    return button;
  }

  function decorateGoogleTable(chartHost) {
    const table = chartHost.querySelector(".google-visualization-table-table");
    if (!table) return;
    for (const cell of table.querySelectorAll("tbody td")) {
      const text = cell.textContent.replace(/\s+/g, " ").trim();
      if (text) cell.title = text;
    }
    const headers = [...table.querySelectorAll("thead th")];
    for (const [index, header] of headers.entries()) {
      if(header.querySelector(".data-column-resizer"))continue;
      const resizer = document.createElement("span");
      resizer.className = "data-column-resizer";
      resizer.title = "Arraste para redimensionar a coluna";
      resizer.setAttribute("aria-hidden", "true");
      resizer.addEventListener("click", event => event.stopPropagation());
      resizer.addEventListener("pointerdown", event => {
        event.preventDefault();
        event.stopPropagation();
        const startX = event.clientX;
        const startWidth = header.getBoundingClientRect().width;
        resizer.setPointerCapture(event.pointerId);
        const resize = moveEvent => {
          const width = Math.max(48, Math.min(640, startWidth + moveEvent.clientX - startX));
          for (const row of table.rows) {
            const cell = row.cells[index];
            if (!cell) continue;
            cell.style.width = `${width}px`;
            cell.style.minWidth = `${width}px`;
            cell.style.maxWidth = `${width}px`;
          }
        };
        const stop = () => {
          resizer.removeEventListener("pointermove", resize);
          resizer.removeEventListener("pointerup", stop);
          resizer.removeEventListener("pointercancel", stop);
        };
        resizer.addEventListener("pointermove", resize);
        resizer.addEventListener("pointerup", stop);
        resizer.addEventListener("pointercancel", stop);
      });
      resizer.addEventListener("dblclick", event => {
        event.preventDefault();
        event.stopPropagation();
        for (const row of table.rows) {
          const cell = row.cells[index];
          if (!cell) continue;
          cell.style.removeProperty("width");
          cell.style.removeProperty("min-width");
          cell.style.removeProperty("max-width");
        }
      });
      header.append(resizer);
    }
  }

  async function drawState(state) {
    if (state.disposed) return;
    const generation = ++state.drawGeneration;
    state.visual.setAttribute("aria-busy", "true");
    state.header.classList.toggle("data-header-has-search", state.view === "table");
    state.visual.classList.toggle("data-visual-table", state.view === "table");
    state.error.textContent = "";
    state.fallback.hidden=false;
    const rows=selectedRows(state.data,state.search.value);
    prepareFallback(state,rows);
    if(google!==true&&typeof loadCharts!=='function'){
      state.visual.hidden=true;state.search.hidden=state.options.search===false;
      state.visual.removeAttribute('aria-busy');return;
    }
    try {
      await waitForChart(loadGoogleCharts(), state.controller.signal);
      if (state.disposed || generation !== state.drawGeneration) return;
      const definition=chartDefinition(state.view,state.data,rows);
      if(state.view!=='table'){
        const color=window.getComputedStyle(state.header).color||'#202b33';
        definition.options.titleTextStyle={...definition.options.titleTextStyle,color};
        definition.options.legend={...definition.options.legend,textStyle:{...definition.options.legend?.textStyle,color}};
        for(const axis of ['hAxis','vAxis'])definition.options[axis]={...definition.options[axis],textStyle:{...definition.options[axis]?.textStyle,color},titleTextStyle:{color}};
      }
      if(state.view==='table'){
        definition.options.page=state.options.pagination===false?'disable':'enable';
        definition.options.pageSize=pageSize(state);
        definition.options.showRowNumber=state.options.rowNumbers!==false;
        for(const [index,column] of state.data.columns.entries())if(state.options.formatters?.[index]||['date','datetime'].includes(column.type)){
          rows.forEach((row,rowIndex)=>definition.data.setFormattedValue(rowIndex,index,escapeTableText(cellText(state,row[index],column,index))));
        }
        addGoogleActions(state,definition.data,rows);
      }
      state.visual.replaceChildren();
      const chartHost = document.createElement("div");
      chartHost.className = "data-google-host";
      state.visual.append(chartHost);
      const chart = new definition.Chart(chartHost);
      if(state.chart)window.google.visualization.events.removeAllListeners?.(state.chart);
      state.chart?.clearChart?.();
      state.chart = chart;
      try {
        await waitForChart(new Promise((resolve, reject) => {
          window.google.visualization.events.addOneTimeListener(chart, "ready", resolve);
          window.google.visualization.events.addOneTimeListener(chart, "error", event => {
            reject(new Error(event?.message || "O Google Charts rejeitou estes dados."));
          });
          chart.draw(definition.data, definition.options);
        }), state.controller.signal);
      } finally { window.google.visualization.events.removeAllListeners?.(chart); }
      if (state.disposed || generation !== state.drawGeneration) { chart.clearChart?.(); return; }
      if(state.view==='table'){
        const decorate=()=>{if(state.disposed||generation!==state.drawGeneration)return;decorateGoogleTable(chartHost);bindGoogleActions(state,chartHost);};
        decorate();
        for(const name of ['sort','page','ready'])window.google.visualization.events.addListener?.(chart,name,()=>window.queueMicrotask(decorate));
      }
      state.chart = chart;
      state.chartHost = chartHost;
      state.fallback.hidden = true;
      state.fallbackPager.hidden=true;
      state.visual.hidden = false;
      state.search.hidden=state.options.search===false||state.view!=="table";
    } catch (error) {
      if (state.disposed || generation !== state.drawGeneration || error.name === 'AbortError') return;
      state.chart = null;
      state.chartHost = null;
      state.visual.hidden = true;
      state.fallback.hidden = false;
      report(state,error);
    } finally {
      if (!state.disposed && generation === state.drawGeneration) state.visual.removeAttribute("aria-busy");
    }
  }

  async function chartPng(state) {
    if (state.view === "table") return "";
    if (!state.chart) await drawState(state);
    if (typeof state.chart?.getImageURI === "function") {
      const image = state.chart.getImageURI();
      if (String(image || "").startsWith("data:image/png;base64,")) return image;
    }
    if (!state.chartHost) throw new Error("O gráfico ainda não está pronto.");
    return elementPng(state.chartHost);
  }

  async function elementPng(element) {
    const bounds = element.getBoundingClientRect();
    const width = Math.max(320, Math.ceil(bounds.width));
    const height = Math.max(180, Math.ceil(bounds.height));
    const canvas = document.createElement("canvas");
    canvas.width = width * 2;
    canvas.height = height * 2;
    const context = canvas.getContext("2d");
    context.scale(2, 2);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);

    const svg = element.querySelector("svg");
    if (svg) {
      const source = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      try {
        const image = await new Promise((resolve, reject) => {
          const value = new Image();
          value.addEventListener("load", () => resolve(value));
          value.addEventListener("error", () => reject(
            new Error("Não foi possível capturar esta visualização."),
          ));
          value.src = url;
        });
        context.drawImage(image, 0, 0, width, height);
        return canvas.toDataURL("image/png");
      } finally {
        URL.revokeObjectURL(url);
      }
    }

    paintDomChart(context, element, bounds);
    return canvas.toDataURL("image/png");
  }

  function isVisibleColor(value) {
    const color = String(value || "").replaceAll(" ", "").toLowerCase();
    return color && color !== "transparent" && color !== "rgba(0,0,0,0)";
  }

  function paintDomChart(context, root, rootBounds) {
    for (const node of [root, ...root.querySelectorAll("*")]) {
      const bounds = node.getBoundingClientRect();
      if (!bounds.width || !bounds.height) continue;
      const x = bounds.left - rootBounds.left;
      const y = bounds.top - rootBounds.top;
      const style = window.getComputedStyle(node);

      if (isVisibleColor(style.backgroundColor)) {
        context.fillStyle = style.backgroundColor;
        context.fillRect(x, y, bounds.width, bounds.height);
      }

      const borders = [
        ["Top", x, y, x + bounds.width, y],
        ["Right", x + bounds.width, y, x + bounds.width, y + bounds.height],
        ["Bottom", x, y + bounds.height, x + bounds.width, y + bounds.height],
        ["Left", x, y, x, y + bounds.height],
      ];
      for (const [side, x1, y1, x2, y2] of borders) {
        const borderWidth = Number.parseFloat(style[`border${side}Width`]);
        const borderColor = style[`border${side}Color`];
        if (!(borderWidth > 0) || !isVisibleColor(borderColor)) continue;
        context.beginPath();
        context.strokeStyle = borderColor;
        context.lineWidth = borderWidth;
        context.moveTo(x1, y1);
        context.lineTo(x2, y2);
        context.stroke();
      }

      if (node.children.length || !node.textContent.trim()) continue;
      const text = node.textContent.replace(/\s+/g, " ").trim();
      const fontSize = Number.parseFloat(style.fontSize) || 12;
      context.fillStyle = isVisibleColor(style.color) ? style.color : "#202124";
      context.font = `${style.fontWeight} ${fontSize}px ${style.fontFamily}`;
      context.textBaseline = "middle";
      context.textAlign = style.textAlign === "center" ? "center" : "left";
      const textX = context.textAlign === "center" ? x + bounds.width / 2 : x + 4;
      context.fillText(text, textX, y + bounds.height / 2, Math.max(0, bounds.width - 8));
    }
  }

  async function requestExport(state,format,button) {
    if(state.disposed||typeof exportData!=='function')return;
    const text=button.textContent;button.disabled=true;button.textContent='Gerando…';
    try {
      const chartImage=format==='pdf'?await chartPng(state):'';
      if(state.disposed)return;
      const data=state.options.exportScope==='filtered'?{...state.data,rows:selectedRows(state.data,state.search.value)}:state.data;
      await exportData({format,view:state.view,data,chartImage},{signal:state.controller.signal});
    } finally {if(!state.disposed){button.disabled=false;button.textContent=text;}}
  }

  function render(value, mount, actionsHost, options = {}) {
    if (options.signal?.aborted) throw new DOMException('Conversa encerrada.', 'AbortError');
    const data = normalizeDataItem(value);
    options={layout:'bubble',search:true,title:true,count:true,views:true,exports:true,pageSize:10,rowNumbers:true,...options};
    if(!['bubble','panel','bare'].includes(options.layout))throw new TypeError('Layout inválido.');
    const actionColumns=validateActions(options.actionColumns||[]);
    const allowed=compatibleViews(data).filter(v=>(google===true||typeof loadCharts==='function'||v==='table')&&(!options.allowedViews||options.allowedViews.includes(v)));
    if(!allowed.length)throw new TypeError('Nenhuma visualização compatível.');
    mounts.get(mount)?.dispose();
    const section = document.createElement("section");
    section.className = 'data-view ccr-data-view';section.dataset.layout=options.layout;
    const title = document.createElement("h3");
    title.className = "data-title";
    title.textContent = displayDataTitle(data.title);
    const count = document.createElement("span");
    count.className = "data-count";
    count.textContent = `${data.rows.length} ${data.rows.length === 1 ? "registro" : "registros"}`;
    const heading = document.createElement("div");
    heading.className = "data-heading";
    heading.append(title, count);
    const header = document.createElement("div");
    header.className = "data-header data-header-has-search";
    const search = document.createElement("input");
    search.type = "search";
    search.className = "data-search";
    search.placeholder = "Buscar na tabela";
    search.setAttribute("aria-label", `Buscar em ${data.title}`);
    const visual = document.createElement("div");
    visual.className = "data-visual";
    const fallback = createNativeTable(data);
    const error = document.createElement("p");
    error.className = "data-error";
    error.setAttribute("role", "status");
    const group = document.createElement("span");
    group.className = "data-action-group";
    const select = document.createElement("select");
    select.className = "data-view-select";
    select.title = `Visualização de ${data.title}`;
    select.setAttribute("aria-label", `Visualização de ${data.title}`);
    for (const view of allowed) {
      const option = document.createElement("option");
      option.value = view;
      option.textContent = VIEW_LABELS[view];
      select.append(option);
    }
    const pdf = actionButton("PDF", "Exportar a visualização atual e a tabela em PDF");
    const excel = actionButton("Excel", "Exportar os dados para uma planilha XLSX");
    select.hidden=options.views===false;
    heading.hidden=options.title===false&&options.count===false;
    title.hidden=options.title===false;count.hidden=options.count===false;
    search.hidden=options.search===false;
    const formats=Array.isArray(options.exportFormats)?options.exportFormats:['pdf','xlsx'];
    pdf.hidden=options.exports===false||typeof exportData!=='function'||!formats.includes('pdf');
    excel.hidden=options.exports===false||typeof exportData!=='function'||!formats.includes('xlsx');
    group.append(select,pdf,excel);group.hidden=select.hidden&&pdf.hidden&&excel.hidden;
    header.hidden=heading.hidden&&search.hidden&&group.hidden;
    header.append(heading, search, group);
    section.append(header, visual, fallback, error);
    let envelopeCleanup;
    if(options.message&&options.layout==='bubble'){
      const envelope=document.createElement('div');envelope.className='ccr-data-envelope';
      // These options come from host code, never from the data/document value.
      envelope.innerHTML=renderChatMessage(options.message,{...options.messageOptions,bodyMarkup:'',actionsMarkup:'',beforeBodyMarkup:'',avatarMarkup:'',deliveryMarkup:''});
      section.dataset.layout='bare';envelope.querySelector('.message-body').append(section);
      const visibility=options.messageVisibility||{};
      for(const [key,selector] of Object.entries({time:'.message-time',date:'.message-day',author:'.author',metrics:'.chat-message-insights',tooltips:'.chat-message-tooltip'})){
        if(visibility[key]===false)for(const node of envelope.querySelectorAll(selector))node.hidden=true;
      }
      envelopeCleanup=bindConversationInteractions(envelope);
      mount.replaceChildren(envelope);
    }else mount.replaceChildren(section);

    const state = {
      data,options,actionColumns,allowed,rowIndexes:new Map(data.rows.map((row,index)=>[row,index])),page:0,sort:null,
      view: allowed.includes('table')?'table':allowed[0],
      chart: null,
      chartHost: null,
      header,
      search,
      visual,
      fallback,
      error,
      disposed: false,
      drawGeneration: 0,
      controller: new window.AbortController(),
    };
    let searchTimer = 0;
    const dispose = () => {
      if (state.disposed) return;
      state.disposed = true; state.drawGeneration++;
      state.controller.abort(); window.clearTimeout(searchTimer);
      envelopeCleanup?.();
      state.chart?.clearChart?.();
      if (state.chart) window.google?.visualization?.events?.removeAllListeners?.(state.chart);
      options.signal?.removeEventListener('abort', dispose);
    };
    state.dispose=dispose;state.signal=state.controller.signal;
    state.refresh=()=>state.ready=drawState(state);
    state.update=(next,nextOptions={})=>render(next,mount,actionsHost,{...options,...nextOptions,initialView:state.view});
    mounts.set(mount,state);
    options.signal?.addEventListener('abort', dispose, { once: true });
    if (options.initialView && allowed.includes(options.initialView)) {
      state.view = options.initialView; select.value = options.initialView;
    }

    select.addEventListener("change", async () => {
      state.view=select.value;state.page=0;
      await drawState(state);
    }, { signal: state.controller.signal });
    search.addEventListener("input", () => {
      window.clearTimeout(searchTimer);
      searchTimer=window.setTimeout(()=>{state.page=0;state.ready=drawState(state);},180);
    }, { signal: state.controller.signal });
    pdf.addEventListener("click", () => {
      requestExport(state,"pdf",pdf).catch(error=>report(state,error));
    }, { signal: state.controller.signal });
    excel.addEventListener("click", () => {
      requestExport(state,"xlsx",excel).catch(error=>report(state,error));
    }, { signal: state.controller.signal });
    state.ready=drawState(state);
    return state;
  }

  function enhance(root, actionsHost, options = {}) {
    for (const table of root.querySelectorAll("table:not([data-showdata])")) {
      table.dataset.showdata = "checked";
      const data = tableModel(table);
      if (!data) continue;
      const mount = document.createElement("div");
      table.replaceWith(mount);
      render(data, mount, actionsHost, options);
    }
  }


  return {render,enhance,compatibleViews,dataAsTsv,normalizeDataItem,parseNumber,tableModel};
}
