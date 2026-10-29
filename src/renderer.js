import {Marked} from 'marked';
import createDOMPurify from 'dompurify';
import {createScope} from './lifecycle.js';
import {createHtmlFrame} from './sandbox.js';
import {createMedia} from './media.js';
import {createDataTable} from './data.js';
import {createDataChart} from './chart.js';

const tags = ['p','br','strong','em','del','ul','ol','li','blockquote','h1','h2','h3','h4','table','thead','tbody','tr','th','td','a','pre','code','hr'];
const parser = new Marked({gfm: true, breaks: true, renderer: {html() { return ''; }}});
const purifiers = new WeakMap();
const scopes = new WeakMap();
const plain = value => typeof value === 'string' ? value : '';

export function splitAnswer(text, kinds = []) {
  const grids = new Set(['chart','data','table','dashboard','html','spa', ...kinds]);
  const parts = [];
  for (const section of plain(text).split(/^\s*<!--\s*resposta\s*-->\s*$/gim).map(v => v.trim()).filter(Boolean)) {
    let current = '', hasGrid = false;
    for (const token of parser.lexer(section)) {
      const grid = token.type === 'table' || token.type === 'code' && grids.has((token.lang || '').toLowerCase());
      if (grid && hasGrid) { parts.push(current.trim()); current = ''; hasGrid = false; }
      current += token.raw; if (grid) hasGrid = true;
    }
    if (current.trim()) parts.push(current.trim());
  }
  return parts.length ? parts : [plain(text)];
}

export function disposeAnswer(element) { scopes.get(element)?.dispose(); scopes.delete(element); }

export function createChatRenderer(options = {}) {
  const plugins = options.plugins || {};
  const limits = {text: 150000, block: 120000, visuals: 4, ...options.limits};
  const snapshots=new WeakMap();
  return {
    update(element,message={},extra={}) {
      const key=JSON.stringify([extra.conversationId,extra.messageId,extra.resourceRevision,message.text,message.attachments]);
      const old=snapshots.get(element);
      if(extra.conversationId&&extra.messageId&&old?.key===key&&!old.handle.signal.aborted)return old.handle;
      const handle=this.render(element,message,extra);snapshots.set(element,{key,handle});return handle;
    },
    split: text => splitAnswer(text, Object.keys(plugins)),
    dispose: disposeAnswer,
    render(element, message = {}, extra = {}) {
      snapshots.delete(element);
      disposeAnswer(element);
      const scope = createScope(); scopes.set(element, scope);
      const document = element.ownerDocument, window = document.defaultView;
      let purify = purifiers.get(window);
      if (!purify) { purify = createDOMPurify(window); purifiers.set(window, purify); }
      const issue = code => { if (!scope.disposed) (extra.onIssue || options.onIssue || (() => {}))(code); };
      const context = {document, window, purify, signal: scope.signal, cleanup: fn => scope.cleanup(fn), onIssue: issue, ...extra, options: {...options, baseUrl: options.baseUrl || document.baseURI}};
      const error = (node, code = 'render_error') => {
        const fallback = document.createElement('p'); fallback.className = 'chat-render-error'; fallback.setAttribute('role', 'status');
        fallback.textContent = 'Não foi possível exibir este conteúdo. O restante da resposta continua disponível.';
        node.replaceWith(fallback); issue(code);
      };
      const text = plain(message.text).slice(0, limits.text);
      element.classList.add('rich');
      element.replaceChildren(purify.sanitize(parser.parse(text), {ALLOWED_TAGS: tags, ALLOWED_ATTR: ['href','class'], RETURN_DOM_FRAGMENT: true}));
      if (plain(message.text).length > limits.text) issue('render_limit');
      for (const link of element.querySelectorAll('a')) {
        try {
          const url = new URL(link.getAttribute('href'));
          if (url.protocol !== 'https:' || url.username || url.password || /[\[\]<>]|%5b|%5d/i.test(url.href)) throw Error();
          link.href = url.href; link.target = '_blank'; link.rel = 'noopener noreferrer';
          options.decorateLink?.(link, url);
        } catch { link.replaceWith(document.createTextNode(link.textContent)); }
      }
      if (options.renderTable) for (const table of [...element.querySelectorAll('table')]) {
        try { const node = options.renderTable(table, context); if (node) { table.replaceWith(node); if (node.dispose) scope.cleanup(() => node.dispose()); } }
        catch { error(table); }
      }
      let visuals = 0;
      const builtins = new Set(['html','spa','audio','voice','video','youtube','image','pdf','file','data','table','chart']);
      for (const code of [...element.querySelectorAll('pre > code')]) {
        const language = code.className.replace('language-', '').toLowerCase(), source = code.textContent;
        if (!Object.hasOwn(plugins, language) && !builtins.has(language)) {
          if (source.length > 30000) error(code.parentElement, 'render_limit');
          continue;
        }
        if (++visuals > limits.visuals || source.length > limits.block) { error(code.parentElement, 'render_limit'); continue; }
        try {
          let result;
          if (Object.hasOwn(plugins, language)) result = plugins[language](source, context);
          else if (language === 'html' || language === 'spa') result = createHtmlFrame(document, source, {scripts: options.allowHtmlScripts === true, runtimeUrl: options.htmlFrameUrl});
          else if (language === 'chart') result = createDataChart(document, JSON.parse(source),{locale:options.locale});
          else if (['data','table'].includes(language)) result = createDataTable(document, JSON.parse(source),{locale:options.locale});
          else result = createMedia(document, {...JSON.parse(source), type: language}, context);
          const node = result?.element || result;
          if (!node || node.ownerDocument !== document || !node.nodeType) throw Error('Plugin inválido');
          code.parentElement.replaceWith(node);
          if (typeof result?.dispose === 'function') scope.cleanup(() => result.dispose());
        } catch { error(code.parentElement); }
      }
      for (const item of (Array.isArray(message.attachments) ? message.attachments : []).slice(0, Math.max(0, limits.visuals - visuals))) {
        try { element.append(createMedia(document, item, context)); } catch { issue('render_error'); }
      }
      return {dispose: () => {
        scope.dispose();
        if (scopes.get(element) === scope) scopes.delete(element);
      }, signal: scope.signal, cleanup: fn => scope.cleanup(fn)};
    }
  };
}
