import {messageTime, sequenceFor} from './presentation.mjs';

const escapeText=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export const isAuthorColor=value=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value);
const colorStyle=color=>isAuthorColor(color)?` style="--author-color:${color}"`:'';
const nonnegative=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0;
/** Metrics are optional host facts; absence is never converted into zero. */
export function messageDetails(metrics){
 if(!metrics||typeof metrics!=='object')return '';
 const parts=[];
 if(typeof metrics.model==='string'&&metrics.model.trim())parts.push('Modelo: '+metrics.model.trim().slice(0,160));
 if(nonnegative(metrics.durationSeconds))parts.push('Duração: '+metrics.durationSeconds+' s');
 for(const [key,label]of [['inputTokens','Tokens de entrada'],['outputTokens','Tokens de saída']])
  if(Number.isSafeInteger(metrics[key])&&metrics[key]>=0)parts.push(label+': '+metrics[key]);
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
 reactions=[],escape=escapeText,timeZone,locale='pt-BR',contextualActions=false,metrics=null
}={}){
 const outgoing=message.direction==='outgoing',group=layout==='group';
 const {date,continuation}=sequenceFor(message,previousMessage,{timeZone,locale});
 const identity=showAuthor&&!continuation;
 const authorHtml=identity?`<div class="author"><span class="author-name"${colorStyle(author.color)}>${escape(author.displayName)}</span>${author.secondaryLabel?`<span class="author-phone">${escape(author.secondaryLabel)}</span>`:''}</div>`:'';
 const totals=reactions.filter(item=>typeof item?.text==='string'&&item.text&&Number.isSafeInteger(item.count)&&item.count>0);
 const reactionsHtml=totals.length?`<div class="message-reactions" aria-label="Reações">${totals.map(({text,count})=>`<span class="message-reaction" aria-label="${escape(text)} · ${count} ${count===1?'reação':'reações'}">${escape(text)}${count>1?`<small>${count}</small>`:''}</span>`).join('')}</div>`:'';
 const fullDate=Number.isSafeInteger(message.createdAt)&&message.createdAt>0?new Intl.DateTimeFormat(locale,{timeZone,dateStyle:'short',timeStyle:'short'}).format(new Date(message.createdAt)):'';
 const bubble=`<article class="bubble ${group?'group-bubble':'private-message'} ${outgoing?'out':''} ${automated?'agent-message':''}" data-message-id="${escape(message.messageId)}" data-message-from-me="${outgoing?'true':'false'}">${authorHtml}${beforeBodyMarkup}<div class="message-body">${bodyMarkup}</div>${reactionsHtml}</article>`;
 const metadata=`<div class="message-time"><span class="message-time-line"><time title="${escape(fullDate)}">${escape(messageTime(message.createdAt,{timeZone,locale}))}</time>${outgoing?deliveryMarkup:''}</span>${message.edited?'<small class="message-edited">editada</small>':''}</div>`;
 const day=date?`<div class="message-day" role="separator" aria-label="${escape(date)}"><strong>${escape(date)}</strong></div>`:'';
 const actions=actionsMarkup?`<div class="message-actions">${actionsMarkup}</div>`:'';
 const avatar=!continuation&&(outgoing?showOutgoingAvatar:showIncomingAvatar)?avatarMarkup:'';
 const details=messageDetails(metrics);
 const insights=details?`<span class="chat-message-insights" tabindex="0" role="note" aria-label="${escape(details)}"><span aria-hidden="true">ⓘ</span><span class="chat-message-tooltip" role="tooltip">${escape(details)}</span></span>`:'';
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
