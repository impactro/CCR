import {createPdfPreview} from './pdf.js';
export function resourceUrl(value, {baseUrl, resourceOrigins = [], allowResource} = {}) {
  if (typeof value !== 'string' || value.length > 2048) throw Error('Recurso inválido');
  const base = new URL(baseUrl);
  const url = new URL(value, base);
  if(url.protocol==='blob:'){
    if(url.origin!==base.origin||typeof allowResource!=='function'||allowResource(url)!==true)throw Error('Blob não autorizado pelo host');
    return url.href;
  }
  if (url.username || url.password || url.hash || !['http:', 'https:'].includes(url.protocol)) throw Error('URL inválida');
  const localArtifact = url.origin === base.origin && /^\/api\/session\/artifact\/[a-f0-9-]{36}$/.test(url.pathname) && !url.search;
  const external = url.protocol === 'https:' && resourceOrigins.includes(url.origin);
  const granted = typeof allowResource === 'function' && allowResource(url) === true;
  if (!localArtifact && !external && !granted) throw Error('Recurso não autorizado pelo host');
  return url.href;
}

export function createMedia(document, item, context) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) throw Error('Mídia inválida');
  const kind = String(item.type || '').toLowerCase();
  const title = typeof item.title === 'string' ? item.title.slice(0, 180) : 'Arquivo da resposta';
  const figure = document.createElement('figure');
  figure.className = 'chat-media chat-media-' + kind;
  if (kind === 'youtube') {
    if (!/^[a-zA-Z0-9_-]{11}$/.test(item.id || '')) throw Error('Vídeo inválido');
    const play = document.createElement('button');
    play.type = 'button'; play.textContent = '▶ Assistir: ' + title;
    play.onclick = () => {
      if (context.signal?.aborted) return;
      const frame = document.createElement('iframe');
      frame.title = title; frame.loading = 'lazy';
      frame.src = 'https://www.youtube-nocookie.com/embed/' + item.id + '?rel=0';
      frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation');
      frame.referrerPolicy = 'no-referrer'; frame.allow = 'encrypted-media; picture-in-picture';
      frame.allowFullscreen = true; play.replaceWith(frame);
      context.cleanup(() => frame.removeAttribute('src'));
    };
    figure.append(play);
  } else {
    const src = resourceUrl(item.url, context.options);
    let media;
    if (kind === 'image') {
      media = document.createElement('img'); media.src = src; media.alt = title;
      media.loading = 'lazy'; media.decoding = 'async'; media.referrerPolicy = 'no-referrer';
    } else if (['audio', 'voice', 'video'].includes(kind)) {
      media = document.createElement(kind === 'video' ? 'video' : 'audio');
      media.controls = true; media.preload = 'none'; media.src = src;
      if (kind === 'video') media.playsInline = true;
      context.cleanup(() => { media.removeAttribute('src'); });
      if (typeof item.transcript === 'string') {
        const transcript = document.createElement('p');
        transcript.className = 'chat-transcript'; transcript.textContent = item.transcript.slice(0, 12000);
        figure.append(transcript);
      }
    } else if (kind === 'pdf') {
      media = createPdfPreview(document,src,context);
    } else if (kind !== 'file') throw Error('Tipo de mídia não suportado');
    if (media) figure.prepend(media);
    const link = document.createElement('a'); link.href = src;
    link.target = '_blank'; link.rel = 'noopener noreferrer';
    link.textContent = kind === 'pdf' ? 'Abrir PDF' : 'Abrir arquivo';
    figure.append(link);
  }
  const caption = document.createElement('figcaption'); caption.textContent = title;
  figure.append(caption);
  return figure;
}
