// src/data-value.mjs
var DATA_TYPES = Object.freeze(["string", "number", "boolean", "date", "datetime", "html"]);
var isIsoDate = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value + "T00:00:00Z")) && (/* @__PURE__ */ new Date(value + "T00:00:00Z")).toISOString().slice(0, 10) === value;
var isIsoDateTime = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(value) && isIsoDate(value.slice(0, 10)) && Number.isFinite(Date.parse(value));
var validCell = (value, type) => value === null || (type === "number" ? typeof value === "number" && Number.isFinite(value) : type === "boolean" ? typeof value === "boolean" : type === "date" ? isIsoDate(value) : type === "datetime" ? isIsoDateTime(value) : type === "string" || type === "html" ? typeof value === "string" && value.length <= 2e3 : typeof value === "string" && value.length <= 2e3 || typeof value === "number" && Number.isFinite(value));
function validateTable(value, { typed = false } = {}) {
  if (!value || !Array.isArray(value.columns) || !value.columns.length || value.columns.length > 16 || !Array.isArray(value.rows) || value.rows.length > 1e4) throw Error("invalid_data");
  const labels = /* @__PURE__ */ new Set();
  const columns = value.columns.map((column) => {
    const label = typeof column === "string" ? column : column?.label, type = typeof column === "object" && column !== null ? column.type : void 0;
    if (typeof label !== "string" || !label.trim() || label.length > 120 || type !== void 0 && !DATA_TYPES.includes(type) || typed && (!type || labels.has(label.toLowerCase()))) throw Error("invalid_column");
    labels.add(label.toLowerCase());
    return type ? { label, type } : { label };
  });
  const rows = value.rows.map((row) => {
    if (!Array.isArray(row) || row.length !== columns.length || row.some((cell, i) => !validCell(cell, columns[i].type))) throw Error("invalid_cell");
    return [...row];
  });
  return { columns, rows };
}

// src/chart-spec.mjs
var escapeXml = (value) => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]);
var tag = (name, attrs = {}, body = "") => `<${name} ${Object.entries(attrs).map(([k, v]) => `${k}="${escapeXml(v)}"`).join(" ")}>${body}</${name}>`;
var text = (x, y, value, size = 16, attrs = {}) => tag("text", { x, y, "font-family": "Courier", "font-size": size, fill: "#203f31", ...attrs }, escapeXml(value));
var strict = (o, fields) => o && typeof o === "object" && !Array.isArray(o) && Object.keys(o).every((k) => fields.includes(k));
function validateChart(chart, columns, rows) {
  if (!strict(chart, ["series"]) || !Array.isArray(chart.series) || !chart.series.length || chart.series.length > 6 || !rows.length || rows.length > 24 || rows.some((r) => String(r[0]).length > 24)) throw Error("invalid_chart");
  const used = /* @__PURE__ */ new Set(), units = {};
  return { series: chart.series.map((s) => {
    if (!strict(s, ["column", "type", "axis", "unit", "color"]) || !Number.isInteger(s.column) || s.column < 1 || columns[s.column]?.type !== "number" || used.has(s.column) || !["line", "column"].includes(s.type) || !["left", "right"].includes(s.axis) || typeof s.unit !== "string" || !s.unit.trim() || s.unit.length > 24 || s.color !== void 0 && !/^#[0-9a-fA-F]{6}$/.test(s.color)) throw Error("invalid_series");
    if (columns[s.column].label.length > 32 || columns[s.column].label.length + s.unit.length > 42) throw Error("series_label_limit");
    if (units[s.axis] !== void 0 && units[s.axis] !== s.unit) throw Error("axis_unit_conflict");
    used.add(s.column);
    units[s.axis] = s.unit;
    return { ...s };
  }) };
}
var palette = ["#11764a", "#295fb2", "#ad4c25", "#7d3e9e", "#007f87", "#a17400"];
function chartScene(value, { view = "column", width = 800, height = 380 } = {}) {
  const explicit = value.chart !== void 0;
  let series, rows = value.rows;
  if (explicit) series = validateChart(value.chart, value.columns, rows).series;
  else {
    const column = value.columns.findIndex((c, i) => i > 0 && rows.some((r) => typeof r[i] === "number"));
    if (column < 0 || !rows.length || rows.length > 100) return null;
    series = [{ column, type: view, axis: "left", unit: "" }];
    rows = rows.filter((r) => typeof r[column] === "number");
  }
  if (!rows.length) return null;
  const label = (i) => typeof value.columns[i] === "string" ? value.columns[i] : value.columns[i].label;
  const fmt = (v) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 4, ...explicit && (Math.abs(v) >= 1e9 || v !== 0 && Math.abs(v) < 1e-4) ? { notation: "scientific" } : {} }).format(v);
  if (!explicit && view === "bar") {
    height = Math.max(220, rows.length * 44 + 85);
    const s = series[0], values = rows.map((r) => r[s.column]), min = Math.min(0, ...values), max = Math.max(0, ...values), range = max - min || 1;
    if (!Number.isFinite(range)) return null;
    const zero = 210 + (0 - min) / range * 440;
    let body2 = text(12, 28, label(s.column), 20, { "font-weight": 700 }) + tag("line", { x1: zero, x2: zero, y1: 42, y2: height - 15, stroke: "#718c7e" });
    rows.forEach((r, i) => {
      const x = 210 + (r[s.column] - min) / range * 440, y = 52 + i * 44;
      body2 += text(8, y + 22, String(r[0]), 16) + tag("rect", { x: Math.min(x, zero), y, width: Math.max(1, Math.abs(x - zero)), height: 30, fill: r[s.column] < 0 ? "#a6502c" : "#11764a" }, tag("title", {}, escapeXml(`${r[0]}: ${fmt(r[s.column])}`))) + text(786, y + 22, fmt(r[s.column]), 17, { "text-anchor": "end", "font-weight": 700 });
    });
    return { width, height, body: body2 };
  }
  const axes = {};
  for (const s of series) {
    const vals = series.filter((t) => t.axis === s.axis).flatMap((t) => rows.map((r) => r[t.column]).filter((v) => v !== null));
    const min = Math.min(0, ...vals), max = Math.max(0, ...vals), range = max - min || 1;
    if (!Number.isFinite(range)) {
      if (!explicit) return null;
      throw Error("chart_range");
    }
    axes[s.axis] = { min, max, range, unit: s.unit };
  }
  const dense = rows.length > 12 || rows.some((r) => String(r[0]).length * 8 > (width - 170) / rows.length);
  const labelSpace = dense ? Math.max(65, ...rows.map((r) => String(r[0]).length * 8 * 0.71 + 24)) : 65;
  const left = 85, right = width - 85, top = 85, bottom = height - labelSpace, step = (right - left) / rows.length;
  const scale = (v, axis) => bottom - (v - axes[axis].min) / axes[axis].range * (bottom - top);
  let body = "";
  series.forEach((s, i) => {
    const color = s.color || palette[i];
    body += tag("line", { x1: 12 + i % 2 * (width / 2), x2: 24 + i % 2 * (width / 2), y1: 14 + Math.floor(i / 2) * 22, y2: 14 + Math.floor(i / 2) * 22, stroke: color, "stroke-width": 10 });
    body += text(30 + i % 2 * (width / 2), 20 + Math.floor(i / 2) * 22, `${label(s.column)}${s.unit ? " (" + s.unit + ")" : ""}`, 13);
  });
  for (const [axis, a] of Object.entries(axes)) {
    const x = axis === "left" ? 5 : width - 5, anchor = axis === "left" ? "start" : "end";
    body += text(x, top - 8, a.unit, 13, { "text-anchor": anchor }) + text(x, top + 15, fmt(a.max), 13, { "text-anchor": anchor }) + text(x, bottom, fmt(a.min), 13, { "text-anchor": anchor });
    body += tag("line", { x1: left, x2: right, y1: scale(0, axis), y2: scale(0, axis), stroke: "#a0b2aa" });
  }
  const columns = series.filter((s) => s.type === "column");
  series.forEach((s, i) => {
    const color = s.color || palette[i], zero = scale(0, s.axis);
    let points = [];
    const flush = () => {
      if (points.length) {
        if (s.type === "area") body += tag("polygon", { points: [[points[0][0], zero], ...points, [points.at(-1)[0], zero]].map((p) => p.join(",")).join(" "), fill: "#cde7d9" });
        body += tag("polyline", { points: points.map((p) => p.join(",")).join(" "), fill: "none", stroke: color, "stroke-width": 3 });
        points = [];
      }
    };
    rows.forEach((r, j) => {
      const v = r[s.column], x = left + step * (j + 0.5);
      if (v === null) {
        flush();
        return;
      }
      const y = scale(v, s.axis), hint = tag("title", {}, escapeXml(`${r[0]}: ${fmt(v)} ${s.unit}`));
      if (s.type === "column" || s.type === "bar") {
        const w = step * 0.7 / Math.max(1, columns.length), offset = explicit ? (columns.indexOf(s) - (columns.length - 1) / 2) * w : 0;
        body += tag("rect", { x: x + offset - w / 2, y: Math.min(y, zero), width: w, height: Math.max(1, Math.abs(y - zero)), fill: color, "data-value": v }, hint);
      } else {
        points.push([x, y]);
        body += tag("circle", { cx: x, cy: y, r: 4, fill: color, "data-value": v }, hint);
      }
      if (!explicit && rows.length <= 12) body += text(x, Math.max(47, y - 10), fmt(v), 17, { "text-anchor": "middle", "font-weight": 700 });
    });
    flush();
  });
  rows.forEach((r, j) => {
    const x = left + step * (j + 0.5), y = bottom + 24;
    body += text(x, y, r[0] === null ? "Sem dado" : r[0], 13, { "text-anchor": dense ? "end" : "middle", ...dense ? { transform: `rotate(-45 ${x} ${y})` } : {} });
  });
  return { width, height, body };
}
function sceneSvg(scene, title = "Gráfico") {
  return tag("svg", { xmlns: "http://www.w3.org/2000/svg", "xmlns:xlink": "http://www.w3.org/1999/xlink", viewBox: `0 0 ${scene.width} ${scene.height}`, width: scene.width, height: scene.height, "font-family": "monospace", role: "img", "aria-label": title }, tag("title", {}, escapeXml(title)) + scene.body);
}

// src/rich-document.mjs
var RICH_DOCUMENT_MAX_BYTES = 1024 * 1024;
var RICH_DOCUMENT_VIEWS = Object.freeze(["table", "bar", "column", "line", "area", "map", "heatmap"]);
var HEADER = "<!-- CES-CCR ";
var object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
var keys = (value, allowed) => object(value) && Object.keys(value).every((key) => allowed.includes(key));
var failed = (code) => ({ status: "invalid", code });
function boundedTree(value) {
  const stack = [[value, 0]], seen = /* @__PURE__ */ new Set();
  let count = 0;
  while (stack.length) {
    const [item, depth] = stack.pop();
    if (++count > 2e5 || depth > 16) throw Error("document_limit");
    if (typeof item === "string" && item.length > RICH_DOCUMENT_MAX_BYTES) throw Error("document_limit");
    if (item === null || typeof item !== "object") {
      if (!["string", "boolean", "number"].includes(typeof item) && item !== null || typeof item === "number" && !Number.isFinite(item)) throw Error("invalid_value");
      continue;
    }
    if (seen.has(item) || !Array.isArray(item) && Object.getPrototypeOf(item) !== Object.prototype && Object.getPrototypeOf(item) !== null) throw Error("invalid_value");
    seen.add(item);
    for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(item))) {
      if (["__proto__", "prototype", "constructor"].includes(key) || descriptor.get || descriptor.set) throw Error("invalid_value");
      if (key !== "length") stack.push([descriptor.value, depth + 1]);
    }
  }
}
function decodeRichDocument(input) {
  try {
    let value = input;
    if (typeof input === "string") {
      if (input.length > RICH_DOCUMENT_MAX_BYTES || new TextEncoder().encode(input).byteLength > RICH_DOCUMENT_MAX_BYTES) return failed("document_limit");
      const source2 = input.replace(/^\uFEFF/, "").trimStart();
      if (source2.startsWith(HEADER)) {
        const end = source2.indexOf("-->");
        if (end < 0 || end > 8192) return failed("invalid_header");
        value = JSON.parse(source2.slice(HEADER.length, end));
        if (!object(value) || value.type !== "html" || value.data !== void 0) return failed("invalid_header");
        value = { ...value, data: { html: source2.slice(end + 3) } };
      } else {
        if (!source2.startsWith("{")) return { status: "unrecognized" };
        value = JSON.parse(source2);
      }
    }
    if (!object(value)) return { status: "unrecognized" };
    boundedTree(value);
    if (value.owner !== "CES" || value.format !== "ccr.document") return { status: "unrecognized" };
    if (new TextEncoder().encode(JSON.stringify(value)).byteLength > RICH_DOCUMENT_MAX_BYTES) return failed("document_limit");
    if (!keys(value, ["owner", "format", "version", "renderer", "type", "view", "title", "data"]) || !keys(value.renderer, ["name", "version"])) return failed("invalid_header");
    if (value.version !== 1 || value.renderer.name !== "CCR" || value.renderer.version !== 1) return { status: "unsupported", code: "unsupported_version" };
    if (typeof value.title !== "string" || !value.title.trim() || value.title.length > 180) return failed("invalid_title");
    let data;
    if (value.type === "data") {
      if (!RICH_DOCUMENT_VIEWS.includes(value.view)) return { status: "unsupported", code: "unsupported_view" };
      if (!keys(value.data, ["columns", "rows", "source", "period", "note", "chart"]) || !Array.isArray(value.data.columns) || !value.data.columns.every((column) => keys(column, ["label", "type"]))) return failed("invalid_data");
      data = validateTable(value.data, { typed: true });
      if (value.data.chart !== void 0) {
        if (!["column", "line"].includes(value.view)) return failed("invalid_chart_view");
        data.chart = validateChart(value.data.chart, data.columns, data.rows);
      }
      for (const field of ["source", "period", "note"]) if (value.data[field] !== void 0) {
        if (typeof value.data[field] !== "string" || value.data[field].length > 800) return failed("invalid_data");
        data[field] = value.data[field];
      }
    } else if (value.type === "text") {
      if (value.view !== void 0 || !keys(value.data, ["text"]) || typeof value.data.text !== "string" || value.data.text.length > 12e3) return failed("invalid_text");
      data = { text: value.data.text };
    } else if (value.type === "image") {
      if (value.view !== void 0 || !keys(value.data, ["resourceId", "alt"]) || typeof value.data.resourceId !== "string" || !/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/.test(value.data.resourceId) || typeof value.data.alt !== "string" || !value.data.alt.trim() || value.data.alt.length > 300) return failed("invalid_image");
      data = { ...value.data };
    } else if (value.type === "report") {
      if (value.view !== void 0 || !keys(value.data, ["columns", "sections"]) || ![1, 2, 3].includes(value.data.columns) || !Array.isArray(value.data.sections) || !value.data.sections.length || value.data.sections.length > 12) return failed("invalid_report");
      const sections = value.data.sections.map((section) => {
        if (section?.type === "report") throw Error("nested_report");
        const result = decodeRichDocument(section);
        if (result.status !== "ready" || !["text", "image", "data"].includes(result.document.type) || result.document.type === "data" && !["table", "bar", "column", "line", "area"].includes(result.document.view)) throw Error("invalid_section");
        return result.document;
      });
      data = { columns: value.data.columns, sections };
    } else if (value.type === "html") {
      if (value.view !== void 0 || !keys(value.data, ["html"]) || typeof value.data.html !== "string" || value.data.html.length > 12e4) return failed("invalid_html");
      data = { html: value.data.html };
    } else return { status: "unsupported", code: "unsupported_type" };
    return { status: "ready", document: { owner: "CES", format: "ccr.document", version: 1, renderer: { name: "CCR", version: 1 }, type: value.type, ...value.view ? { view: value.view } : {}, title: value.title, data } };
  } catch (error) {
    return failed(error instanceof SyntaxError ? "invalid_json" : error?.message === "document_limit" ? "document_limit" : "invalid_document");
  }
}

// src/document-scene.mjs
var PAGE_WIDTH = 1200;
var PAGE_HEIGHT = 1600;
var MAX_PAGES = 32;
var gap = 20;
var margin = 36;
var contentWidth = PAGE_WIDTH - margin * 2;
function lines(value, chars) {
  const result = [];
  for (const line of String(value).split("\n")) {
    const points = Array.from(line);
    if (!points.length) result.push("");
    else for (let i = 0; i < points.length; i += chars) result.push(points.slice(i, i + chars).join(""));
  }
  return result;
}
function paragraph(value, width, x, y, size = 16) {
  const list = lines(value, Math.max(1, Math.floor(width / (size * 0.65))));
  return { body: list.map((v, i) => text(x, y + i * (size + 6), v, size)).join(""), height: list.length * (size + 6) };
}
function imageData(resource) {
  if (!resource || Object.keys(resource).some((k) => !["mime", "base64", "width", "height"].includes(k)) || !["image/png", "image/jpeg"].includes(resource.mime) || typeof resource.base64 !== "string" || resource.base64.length < 12 || resource.base64.length > 8e6 || !/^[A-Za-z0-9+/]*={0,2}$/.test(resource.base64) || !Number.isInteger(resource.width) || !Number.isInteger(resource.height) || resource.width < 1 || resource.height < 1 || resource.width * resource.height > 16e6) throw Error("invalid_image_resource");
  return `data:${resource.mime};base64,${resource.base64}`;
}
function panel(doc, width, resolveResource) {
  const heading = paragraph(doc.title, width - 24, 12, 26, 18);
  let body = heading.body, y = heading.height + 18;
  if (doc.type === "text") {
    const p = paragraph(doc.data.text, width - 24, 12, y + 18);
    body += p.body;
    y += p.height + 20;
  } else if (doc.type === "image") {
    const resource = resolveResource?.(doc.data.resourceId);
    if (!resource) throw Error("missing_image_resource");
    const href = imageData(resource), h = Math.min(300, (width - 24) * resource.height / resource.width);
    body += tag("image", { x: 12, y, width: width - 24, height: h, href, "xlink:href": href, preserveAspectRatio: "xMidYMid meet" }, tag("title", {}, escapeXml(doc.data.alt)));
    y += h + 8;
    const alt = paragraph(doc.data.alt, width - 24, 12, y + 16, 13);
    body += alt.body;
    y += alt.height + 16;
  } else if (doc.type === "data") {
    if (doc.view === "table") {
      const table = tableChunk(doc, doc.data.rows, width);
      body += tag("g", { transform: `translate(0 ${y})` }, table.body);
      y += table.height;
    } else if (["bar", "column", "line", "area"].includes(doc.view)) {
      if (width < 500 || doc.data.rows.length > 24 || doc.data.rows.some((r) => String(r[0]).length > 24) || doc.data.columns.some((c) => c.label.length > 32) || doc.data.chart?.series.some((s) => doc.data.columns[s.column].label.length + s.unit.length > 42)) throw Error("chart_layout_limit");
      const scene = chartScene(doc.data, { view: doc.view, width: Math.max(width, 760), height: 400 });
      if (!scene) throw Error("chart_not_renderable");
      const scale = (width - 24) / scene.width;
      body += tag("g", { transform: `translate(12 ${y}) scale(${scale})` }, scene.body);
      y += scene.height * scale;
    } else throw Error("export_view_unsupported");
    for (const key of ["source", "period", "note"]) if (doc.data[key]) {
      const p = paragraph(doc.data[key], width - 24, 12, y + 16, 13);
      body += p.body;
      y += p.height + 8;
    }
  } else throw Error("export_type_unsupported");
  return { body, height: y + 16 };
}
function tableChunk(doc, rows, width) {
  const n = doc.data.columns.length, cw = (width - 24) / n, chars = Math.floor((cw - 12) / 9);
  if (chars < 3) throw Error("table_layout_limit");
  let body = "", y = 0;
  const row = (values, head = false) => {
    if (doc.data.columns.some((c) => c.type === "html")) throw Error("export_html_cell_unsupported");
    const wrapped = values.map((v) => lines(v === null ? "Sem dado" : typeof v === "boolean" ? v ? "Sim" : "Não" : v, chars)), h = Math.max(...wrapped.map((a) => a.length)) * 22 + 12;
    if (h > 600) throw Error("table_cell_layout_limit");
    body += tag("rect", { x: 12, y, width: width - 24, height: h, fill: head ? "#e2eee8" : "#ffffff", stroke: "#b9cdc0" });
    wrapped.forEach((a, i) => a.forEach((v, j) => {
      body += text(18 + i * cw, y + 22 + j * 22, v, 15, head ? { "font-weight": 700 } : {});
    }));
    y += h;
  };
  row(doc.data.columns.map((c) => c.label), true);
  rows.forEach((r) => row(r));
  return { body, height: y + 12 };
}
function documentPages(input, { resolveResource } = {}) {
  const decoded = decodeRichDocument(input);
  if (decoded.status !== "ready") throw Error(decoded.code || decoded.status);
  const doc = decoded.document, pages = [];
  let body = "", y = margin;
  const newPage = () => {
    if (body) {
      pages.push({ width: PAGE_WIDTH, height: PAGE_HEIGHT, body });
      if (pages.length > MAX_PAGES) throw Error("page_limit");
    }
    body = "";
    y = margin;
  };
  const add = (p, x = margin) => {
    if (p.height > PAGE_HEIGHT - margin * 2) throw Error("panel_layout_limit");
    if (y + p.height > PAGE_HEIGHT - margin) newPage();
    body += tag("g", { transform: `translate(${x} ${y})` }, p.body);
    y += p.height + gap;
  };
  if (doc.type === "report") {
    const title = paragraph(doc.title, contentWidth, 0, 26, 24);
    add({ body: title.body, height: title.height + 12 });
    const report = (reportDoc, width, x, depth) => {
      if (depth > 0) throw Error("nested_report_export_unsupported");
      const cols = reportDoc.data.columns, w = (width - gap * (cols - 1)) / cols;
      for (let i = 0; i < reportDoc.data.sections.length; i += cols) {
        const panels = reportDoc.data.sections.slice(i, i + cols).map((d) => panel(d, w, resolveResource)), height = Math.max(...panels.map((p) => p.height));
        add({ height, body: panels.map((p, j) => tag("g", { transform: `translate(${j * (w + gap)} 0)` }, tag("rect", { x: 0, y: 0, width: w, height, rx: 6, fill: "#ffffff", stroke: "#b9cdc0" }) + p.body)).join("") }, x);
      }
    };
    report(doc, contentWidth, margin, 0);
  } else if (doc.type === "data" && doc.view === "table") {
    let rows = [];
    const emit = () => {
      add(panel({ ...doc, data: { ...doc.data, rows } }, contentWidth, resolveResource));
      rows = [];
    };
    for (const row of doc.data.rows) {
      const candidate = [...rows, row], p = panel({ ...doc, data: { ...doc.data, rows: candidate } }, contentWidth, resolveResource);
      if (p.height > PAGE_HEIGHT - margin * 2) {
        if (!rows.length) throw Error("table_row_layout_limit");
        emit();
        newPage();
      }
      rows.push(row);
    }
    if (rows.length || !doc.data.rows.length) emit();
  } else add(panel(doc, contentWidth, resolveResource));
  newPage();
  return pages.map((p, i) => sceneSvg({ ...p, body: tag("rect", { width: p.width, height: p.height, fill: "#ffffff" }) + p.body + text(margin, PAGE_HEIGHT - 12, `${i + 1}/${pages.length}`, 12) }, doc.title));
}

// src/export-runtime.mjs
var source = "";
try {
  for await (const chunk of process.stdin) {
    source += chunk;
    if (Buffer.byteLength(source) > 32e6) throw Error("runtime_input_limit");
  }
  const input = JSON.parse(source), resources = input.resources || {};
  const pages = documentPages(input.document, { resolveResource: (id) => Object.hasOwn(resources, id) ? resources[id] : null });
  const result = JSON.stringify({ pages });
  if (Buffer.byteLength(result) > 64e6) throw Error("runtime_output_limit");
  process.stdout.write(result);
} catch (error) {
  process.stderr.write(String(error.message));
  process.exitCode = 1;
}
