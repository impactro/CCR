import {messageTime, sequenceFor} from './presentation.mjs';

const escapeText=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

/** A received snapshot, never a tracker. No remote request until the link is opened. */
export function renderChatPosition(location,{escape=escapeText}={}){
 const lat=location?.latitude,lon=location?.longitude;
 if(typeof lat!=='number'||typeof lon!=='number'||!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)return '';
 const query=encodeURIComponent(`${lat},${lon}`),url=`https://www.google.com/maps/search/?api=1&query=${query}`;
 const osm=`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`;
 return `<section class="chat-position" aria-label="Posição GPS"><a href="${url}" target="_blank" rel="noopener noreferrer" aria-label="Abrir posição no Google Maps"><svg viewBox="0 0 320 120" role="img" aria-label="Posição recebida, sem rastreamento"><rect width="320" height="120" rx="12" fill="#e8f1ed"/><path d="M0 30L320 85M0 95L320 20M70 0L110 120M250 0L210 120" stroke="#fff" stroke-width="12"/><path d="M160 25c-17 0-27 12-27 27 0 20 27 43 27 43s27-23 27-43c0-15-10-27-27-27" fill="#246658"/><circle cx="160" cy="51" r="9" fill="#fff"/></svg><strong>${escape(location.name||'Posição recebida')}</strong><span>${escape(location.address||`${lat.toFixed(6)}, ${lon.toFixed(6)}`)}</span></a><a href="${osm}" target="_blank" rel="noopener noreferrer">Abrir no OpenStreetMap</a></section>`;
}
export const isAuthorColor=value=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value);
const colorStyle=color=>isAuthorColor(color)?` style="--author-color:${color}"`:'';
const nonnegative=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0;
const tokenCount=value=>Number.isSafeInteger(value)&&value>=0;
function metricDuration(value){
 const seconds=Math.round(value),hours=Math.floor(seconds/3600),minutes=Math.floor(seconds/60)%60,rest=seconds%60;
 if(hours)return `${hours}h${String(minutes).padStart(2,'0')}m${String(rest).padStart(2,'0')}s`;
 if(minutes)return `${minutes}m${String(rest).padStart(2,'0')}s`;
 return `${rest}s`;
}
/** Metrics are optional host facts; absence is never converted into zero. */
export function messageDetails(metrics){
 if(!metrics||typeof metrics!=='object')return '';
 const parts=[];
 const model=typeof metrics.model==='string'?metrics.model.trim().slice(0,160):'';
 const total=nonnegative(metrics.totalDurationSeconds)?metrics.totalDurationSeconds:
  nonnegative(metrics.durationSeconds)?metrics.durationSeconds:null;
 if(model||total!==null||tokenCount(metrics.inputTokens)||tokenCount(metrics.outputTokens)){
  parts.push('Total: '+(total===null?'—':metricDuration(total)));
  parts.push('Tokens '+(tokenCount(metrics.inputTokens)?metrics.inputTokens:'—')+' / '+(tokenCount(metrics.outputTokens)?metrics.outputTokens:'—'));
  if(model)parts.push(model);
 }
 if(nonnegative(metrics.credits))parts.push((metrics.creditsEstimated===true?'Créditos estimados: ':'Créditos: ')+metrics.credits);
 if(nonnegative(metrics.cost)&&typeof metrics.currency==='string'&&/^[A-Z]{3}$/.test(metrics.currency))
  parts.push((metrics.costEstimated===true?'Custo estimado: ':'Custo: ')+metrics.cost+' '+metrics.currency);
 return parts.join(' · ');
}

/** Local presentation listeners; no clipboard, network or transport effects. */
export function bindConversationInteractions(root,{signal}={}){
 const controller=new root.ownerDocument.defaultView.AbortController();
 const dispose=()=>{controller.abort();signal?.removeEventListener('abort',dispose);};
 if(signal?.aborted){dispose();return dispose;}
 signal?.addEventListener('abort',dispose,{once:true});
 const insight=event=>event.target?.closest?.('.chat-message-insights');
 root.addEventListener('keydown',event=>{const node=insight(event);
  if(event.key==='Escape'&&node&&root.contains(node)){node.dataset.detailsDismissed='true';event.stopPropagation();}
  if(event.key==='Escape'){
   const content=event.target?.closest?.('.chat-message-content');
   const toggle=content?.querySelector('.chat-actions-toggle[aria-expanded="true"]');
   if(toggle&&root.contains(toggle)){toggle.setAttribute('aria-expanded','false');toggle.focus();event.stopPropagation();}
  }
 },{signal:controller.signal});
 root.addEventListener('click',event=>{
  const toggle=event.target?.closest?.('.chat-actions-toggle');
  if(toggle&&root.contains(toggle))toggle.setAttribute('aria-expanded',String(toggle.getAttribute('aria-expanded')!=='true'));
 },{signal:controller.signal});
 for(const type of ['focusout','pointerout'])root.addEventListener(type,event=>{
  const node=insight(event);if(node&&!node.contains(event.relatedTarget))delete node.dataset.detailsDismissed;
 },{signal:controller.signal});
 return dispose;
}

/**
 * Render the message envelope, independent of transport and rich-body syntax.
 * Message IDs/authorId are opaque, createdAt is UTC epoch milliseconds and
 * direction is relative to the viewer. Never infer an author from role/name.
 *
 * The host resolves author {id,displayName,color?,secondaryLabel?}, reactions
 * [{text,count}], layout and authorization. *Markup slots are TRUSTED host
 * output, never raw message HTML. Text fields are escaped. No event handlers,
 * requests, identity lookup, resource loading, storage or global view state.
 * Existing CWH class/data hooks are retained to preserve its installed themes
 * and keyed DOM reconciler; data-message-from-me reflects direction only.
 */
export function renderChatMessage(message,{
 previousMessage,author={},layout='private',showAuthor=layout==='group',
 showIncomingAvatar=showAuthor,showOutgoingAvatar=false,automated=false,
 avatarMarkup='',bodyMarkup='',actionsMarkup='',beforeBodyMarkup='',deliveryMarkup='',
 reactions=[],escape=escapeText,timeZone,locale='pt-BR',contextualActions=false,metrics=null,detailsPlacement='indicator'
}={}){
 const outgoing=message.direction==='outgoing',group=layout==='group';
 const {date,continuation}=sequenceFor(message,previousMessage,{timeZone,locale});
 const identity=showAuthor&&!continuation;
 const authorHtml=identity?`<div class="author"><span class="author-name"${colorStyle(author.color)}>${escape(author.displayName)}</span>${author.secondaryLabel?`<span class="author-phone">${escape(author.secondaryLabel)}</span>`:''}</div>`:'';
 const totals=reactions.filter(item=>typeof item?.text==='string'&&item.text&&Number.isSafeInteger(item.count)&&item.count>0);
 const reactionsHtml=totals.length?`<div class="message-reactions" aria-label="Reações">${totals.map(({text,count})=>`<span class="message-reaction" aria-label="${escape(text)} · ${count} ${count===1?'reação':'reações'}">${escape(text)}${count>1?`<small>${count}</small>`:''}</span>`).join('')}</div>`:'';
 const fullDate=Number.isSafeInteger(message.createdAt)&&message.createdAt>0?new Intl.DateTimeFormat(locale,{timeZone,dateStyle:'short',timeStyle:'short'}).format(new Date(message.createdAt)):'';
 const details=messageDetails(metrics);
 const timeDetails=details&&detailsPlacement==='time';
 const timeText=escape(messageTime(message.createdAt,{timeZone,locale}));
 const timeMarkup=timeDetails?`<span class="chat-message-insights" tabindex="0" role="note" aria-label="${escape([fullDate,details].filter(Boolean).join(' · '))}"><time>${timeText}</time><span class="chat-message-tooltip" role="tooltip">${escape([fullDate,details].filter(Boolean).join(' · '))}</span></span>`:`<time title="${escape(fullDate)}">${timeText}</time>`;
 const bubble=`<article class="bubble ${group?'group-bubble':'private-message'} ${outgoing?'out':''} ${automated?'agent-message':''}" data-message-id="${escape(message.messageId)}" data-message-from-me="${outgoing?'true':'false'}">${authorHtml}${beforeBodyMarkup}<div class="message-body">${bodyMarkup}</div>${reactionsHtml}</article>`;
 const metadata=`<div class="message-time"><span class="message-time-line">${timeMarkup}${outgoing?deliveryMarkup:''}</span>${message.edited?'<small class="message-edited">editada</small>':''}</div>`;
 const day=date?`<div class="message-day" role="separator" aria-label="${escape(date)}"><strong>${escape(date)}</strong></div>`:'';
 const actions=actionsMarkup?`<div class="message-actions">${actionsMarkup}</div>`:'';
 const avatar=!continuation&&(outgoing?showOutgoingAvatar:showIncomingAvatar)?avatarMarkup:'';
 const insights=details&&!timeDetails?`<span class="chat-message-insights" tabindex="0" role="note" aria-label="${escape(details)}"><span aria-hidden="true">ⓘ</span><span class="chat-message-tooltip" role="tooltip">${escape(details)}</span></span>`:'';
 const toggle=actions?'<button type="button" class="chat-actions-toggle" aria-label="Ações da mensagem" aria-expanded="false">⋯</button>':'';
 const contextual=`<div class="chat-message-content"${actions?' tabindex="0"':''}>${bubble}${toggle}${actions}${insights}</div>`;
 const content=contextualActions?(outgoing?`${contextual}${metadata}${avatar}`:`<div class="message-leading">${avatar}${metadata}</div>${contextual}`):
  outgoing?`${bubble}${actions}${metadata}${avatar}${insights}`:`<div class="message-leading">${avatar}${metadata}</div>${bubble}${actions}${insights}`;
 return `${day}<div class="message-row chat-message-row ${contextualActions?'chat-contextual-actions ':''}${group?'group-message-row':'private-message-row'} ${outgoing?'out':'in'} ${continuation?'continuation':''} ${totals.length?'has-reactions':''} ${actions?'has-actions':''}" data-message-row="${escape(message.messageId)}:${outgoing?'out':'in'}">${content}</div>`;
}

/** replyTo {conversationId,messageId,authorId,preview:{text}} is resolved by
 * the host. The quoted author descriptor is independent of the replying author.
 * Unknown/unavailable originals retain readable text; no automatic navigation.
 */
export function renderChatQuote(replyTo,{author={},escape=escapeText}={}){
 if(!replyTo)return '';
 return `<div class="chat-message-quote"${colorStyle(author.color)}><strong>${escape(author.displayName||'Mensagem citada')}</strong><span>${escape((replyTo.preview?.text||'Conteúdo citado').slice(0,500))}</span></div>`;
}
