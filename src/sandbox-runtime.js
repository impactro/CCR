// Loaded only inside the opaque sandbox document. No host APIs or credential bridge.
let mounted = false;
window.addEventListener('message', event => {
  if (mounted || event.source !== parent || event.data?.type !== 'crania:render-html') return;
  const {html, scripts} = event.data;
  if (typeof html !== 'string' || html.length > 120000 || typeof scripts !== 'boolean') return;
  mounted = true;
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const code = [...parsed.querySelectorAll('script:not([src])')].map(node => node.textContent).join('\n;\n');
  parsed.querySelectorAll('script,iframe,object,embed,base,meta,link').forEach(node => node.remove());
  parsed.querySelectorAll('form').forEach(node => node.replaceWith(...node.childNodes));
  for (const node of parsed.querySelectorAll('*')) for (const attr of [...node.attributes]) {
    if (/^on/i.test(attr.name) || attr.name === 'srcdoc') node.removeAttribute(attr.name);
  }
  const content = document.querySelector('#content');
  for (const style of parsed.head.querySelectorAll('style')) content.append(document.importNode(style, true));
  for (const node of [...parsed.body.childNodes]) content.append(document.importNode(node, true));
  if (scripts && code.trim()) {
    try { (0, eval)(code); }
    catch {
      const status = document.createElement('p'); status.setAttribute('role', 'status');
      status.textContent = 'O aplicativo encontrou um erro. O conteúdo continua disponível.';
      content.append(status);
    }
  }
});
