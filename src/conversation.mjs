import {messageTime, sequenceFor} from './presentation.mjs';

const escapeText=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export const isAuthorColor=value=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value);
const colorStyle=color=>isAuthorColor(color)?` style="--author-color:${color}"`:'';

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
 reactions=[],escape=escapeText,timeZone,locale='pt-BR'
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
 const content=outgoing?`${bubble}${actions}${metadata}${avatar}`:`<div class="message-leading">${avatar}${metadata}</div>${bubble}${actions}`;
 return `${day}<div class="message-row chat-message-row ${group?'group-message-row':'private-message-row'} ${outgoing?'out':'in'} ${continuation?'continuation':''} ${totals.length?'has-reactions':''} ${actions?'has-actions':''}" data-message-row="${escape(message.messageId)}:${outgoing?'out':'in'}">${content}</div>`;
}

/** replyTo {conversationId,messageId,authorId,preview:{text}} is resolved by
 * the host. The quoted author descriptor is independent of the replying author.
 * Unknown/unavailable originals retain readable text; no automatic navigation.
 */
export function renderChatQuote(replyTo,{author={},escape=escapeText}={}){
 if(!replyTo)return '';
 return `<div class="chat-message-quote"${colorStyle(author.color)}><strong>${escape(author.displayName||'Mensagem citada')}</strong><span>${escape((replyTo.preview?.text||'Conteúdo citado').slice(0,500))}</span></div>`;
}
