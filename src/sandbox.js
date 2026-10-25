export function createHtmlFrame(document, html, {scripts = false, title = 'Aplicativo da resposta', maxChars = 120000, runtimeUrl} = {}) {
  if (typeof html !== 'string' || html.length > maxChars) throw Error('HTML acima do limite');
  if (scripts && !runtimeUrl) throw Error('Miniapp interativo exige runtime isolado do host');
  const frame = document.createElement('iframe');
  frame.title = title;
  frame.className = 'chat-html-frame';
  frame.setAttribute('sandbox', scripts ? 'allow-scripts' : '');
  frame.referrerPolicy = 'no-referrer';
  frame.loading = 'lazy';
  if (runtimeUrl) {
    // Only our bootstrap runs when scripts=false; supplied scripts are not evaluated.
    frame.setAttribute('sandbox', 'allow-scripts');
    const url = new URL(runtimeUrl, document.baseURI);
    if (url.origin !== new URL(document.baseURI).origin || url.search || url.hash) throw Error('Runtime do sandbox inválido');
    frame.src = url.href;
    const send = () => frame.contentWindow?.postMessage({type: 'crania:render-html', html, scripts}, '*');
    frame.addEventListener('load', send, {once: true});
    frame.dispose = () => { frame.removeEventListener('load', send); frame.removeAttribute('src'); };
    return frame;
  }
  const csp = `default-src 'none'; script-src ${scripts ? "'unsafe-inline'" : "'none'"}; style-src 'unsafe-inline'; img-src data:; media-src data:; connect-src 'none'; frame-src 'none'; object-src 'none'; form-action 'none'; base-uri 'none'`;
  const parsed=new document.defaultView.DOMParser().parseFromString(html,'text/html');
  parsed.querySelectorAll('script,iframe,object,embed,base,meta,link').forEach(node=>node.remove());
  parsed.querySelectorAll('form').forEach(node=>node.replaceWith(...node.childNodes));
  for(const node of parsed.querySelectorAll('*'))for(const attr of [...node.attributes])if(/^on/i.test(attr.name)||['href','action','formaction','srcdoc'].includes(attr.name))node.removeAttribute(attr.name);
  html=[...parsed.head.querySelectorAll('style')].map(style=>style.outerHTML).join('')+parsed.body.innerHTML;
  // The first CSP remains in force even if supplied HTML includes another policy.
  frame.srcdoc = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${csp}"><style>body{font:15px system-ui;margin:16px;color:#18352c;background:white}img,svg,video{max-width:100%}button,input,select{font:inherit}table{border-collapse:collapse}td,th{padding:6px;border:1px solid #ccd8d2}</style></head><body>${html}</body></html>`;
  return frame;
}
