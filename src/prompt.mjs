import canonical from '../config/prompts/render.prompt.json' with {type:'json'};

export const RENDER_PROMPT_VERSION = canonical.version;
export const RENDER_PROMPT_SCHEMA_VERSION = canonical.schemaVersion;
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const fail = code => { throw new TypeError(code); };
const names = value => typeof value === 'string' && /^[a-z][a-z0-9_.-]{0,79}$/.test(value);
const fenceName = value => typeof value === 'string' && /^[a-z][a-z0-9-]{0,63}$/.test(value);

function jsonCopy(input, maxBytes = 32768) {
  let count = 0; const seen = new Set();
  function check(value, depth) {
    if (++count > 10000 || depth > 16) fail('prompt_descriptor_limit');
    if (value === null || ['string','boolean'].includes(typeof value)) return;
    if (typeof value === 'number' && Number.isFinite(value)) return;
    if (typeof value !== 'object' || seen.has(value)) fail('prompt_descriptor_json_required');
    if (!Array.isArray(value) && ![null,Object.prototype].includes(Object.getPrototypeOf(value))) fail('prompt_descriptor_json_required');
    seen.add(value);
    for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
      if (['__proto__','prototype','constructor'].includes(key) || descriptor.get || descriptor.set) fail('prompt_descriptor_json_required');
      if (key !== 'length') check(descriptor.value, depth + 1);
    }
    seen.delete(value);
  }
  check(input, 0);
  const source = JSON.stringify(input);
  if (new TextEncoder().encode(source).byteLength > maxBytes) fail('prompt_descriptor_limit');
  return JSON.parse(source);
}

/** A copy, so consumer changes cannot mutate the canonical prompt. No I/O. */
export function getRenderPromptContract() { return jsonCopy(canonical, 65536); }

/** Validates the descriptor, NOT plugin data or installation/authorization. */
export function validateRenderPromptPlugin(input) {
  const p = jsonCopy(input);
  if (!object(p) || Object.keys(p).some(k => !['id','version','fence','schema','instructions','examples'].includes(k)) || !names(p.id)
      || typeof p.version !== 'string' || !/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(p.version) || !fenceName(p.fence)
      || !object(p.schema) || !['object','array','string'].includes(p.schema.type)
      || !Array.isArray(p.instructions) || !p.instructions.length || p.instructions.length > 8
      || p.instructions.some(s => typeof s !== 'string' || !s.trim() || s.length > 2000)
      || !Array.isArray(p.examples) || !p.examples.length || p.examples.length > 4
      || p.examples.some(e => !object(e) || Object.keys(e).some(k => k !== 'content') || !Object.hasOwn(e,'content'))) fail('prompt_plugin_invalid');
  const inspect = value => {
    if (value && typeof value === 'object') for (const [key, child] of Object.entries(value)) {
      if (key === '$ref' || key === '$dynamicRef') fail('prompt_plugin_schema_refs_unsupported');
      inspect(child);
    }
  };
  inspect(p.schema);
  return p;
}

function example(fence, content) {
  const source = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
  // A longer fence keeps a plugin example containing backticks inside its block.
  const ticks = '`'.repeat(Math.max(3, ...[...source.matchAll(/`+/g)].map(x => x[0].length + 1)));
  return `${ticks}${fence}\n${source}\n${ticks}`;
}

/** Trusted host configuration only; defaults advertise Markdown, no plugins. */
export function buildRenderPrompt(options = {}) {
  if (!object(options) || Object.keys(options).some(k => !['capabilities','plugins','limits'].includes(k))) fail('prompt_options_invalid');
  const {capabilities = [], plugins = [], limits = {}} = options;
  if (!Array.isArray(capabilities) || capabilities.length > 32 || capabilities.some(id => !canonical.capabilities.some(c => c.id === id))
      || !Array.isArray(plugins) || plugins.length > 8 || !object(limits)) fail('prompt_capabilities_invalid');
  const effective = {...canonical.limits};
  for (const [key, value] of Object.entries(limits)) {
    if (!Object.hasOwn(effective,key) || !Number.isSafeInteger(value) || value < (key === 'visuals' ? 0 : 1) || value > effective[key]) fail('prompt_limits_invalid');
    effective[key] = value;
  }
  effective.chartRows = Math.min(effective.chartRows, effective.rows);
  effective.mapPoints = Math.min(effective.mapPoints, effective.rows);
  const selected = canonical.capabilities.filter(c => capabilities.includes(c.id));
  const extra = plugins.map(validateRenderPromptPlugin).sort((a,b) => a.id.localeCompare(b.id));
  if (effective.visuals === 0 && (selected.length || extra.length)) fail('prompt_visuals_disabled');
  const ids = new Set(), fences = new Set(selected.flatMap(c => c.fences));
  for (const p of extra) {
    if (ids.has(p.id) || fences.has(p.fence)) fail('prompt_plugin_conflict');
    ids.add(p.id); fences.add(p.fence);
  }
  const parts = [`# CCR render contract ${canonical.version} (schema ${canonical.schemaVersion}; package ${canonical.packageVersion})`,
    ...canonical.instructions, `Effective limits: ${JSON.stringify(effective)}`,
    `Available capabilities: ${selected.map(c => c.id).join(', ') || 'Markdown only'}.`];
  for (const c of selected) {
    parts.push(`## ${c.id}`, ...c.instructions);
    for (const e of c.examples) parts.push(example(e.fence,e.content));
  }
  for (const p of extra) {
    parts.push(`## Host plugin ${p.id}@${p.version} (fence ${p.fence})`, ...p.instructions,
      'Payload schema supplied by the trusted host:', example('json',p.schema));
    for (const e of p.examples) parts.push(example(p.fence,e.content));
  }
  const text = parts.join('\n\n') + '\n';
  if (text.length > 65536) fail('prompt_output_limit');
  return text;
}
