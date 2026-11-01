import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {renderChatMessage,renderChatQuote,isAuthorColor,messageDetails,bindConversationInteractions} from '../../src/conversation.mjs';

const first={conversationId:'workspace-one/chat-one',messageId:'m1',authorId:'agent-one',role:'assistant',direction:'incoming',createdAt:Date.parse('2026-10-29T13:30:00Z')};
const options={layout:'group',author:{id:'agent-one',displayName:'Agent one',color:'#123456'},avatarMarkup:'<span class="avatar">A</span>',bodyMarkup:'<p>Text</p>'};
const doc=html=>new JSDOM(html).window.document;

test('two assistant authors never merge by role; conversation, local day and direction isolate sequences',()=>{
 const next={...first,messageId:'m2',createdAt:first.createdAt+60000};
 assert.match(renderChatMessage(next,{...options,previousMessage:first}),/ continuation/);
 for(const change of [{authorId:'agent-two'},{conversationId:'workspace-two/chat-one'},{direction:'outgoing'},{createdAt:first.createdAt+86400000},{authorId:null},{role:'system'},{breakBefore:true}]){
  const node=doc(renderChatMessage({...next,...change},{...options,previousMessage:first}));
  assert.equal(node.querySelector('.message-row').classList.contains('continuation'),false);
  assert.ok(node.querySelector('.author-name'));
 }
});

test('author descriptor colors follow identity across conversations; quote uses cited author',()=>{
 for(const conversationId of ['one','two']){
  const quote=renderChatQuote({conversationId,messageId:'original',authorId:'author-two',preview:{text:'Cited'}},{author:{id:'author-two',displayName:'Author two',color:'#654321'}});
  const node=doc(renderChatMessage({...first,conversationId},{...options,bodyMarkup:quote}));
  assert.equal(node.querySelector('.author-name').style.getPropertyValue('--author-color'),'#123456');
  assert.equal(node.querySelector('.chat-message-quote').style.getPropertyValue('--author-color'),'#654321');
  assert.equal(node.querySelector('.chat-message-quote strong').textContent,'Author two');
 }
});

test('untrusted author, IDs, quote and reaction text cannot become HTML or CSS',()=>{
 const bad='<img src=x onerror=evil>',quote=renderChatQuote({preview:{text:bad}},{author:{displayName:bad,color:'#123456;display:none'}});
 const node=doc(renderChatMessage({...first,messageId:'" onclick="evil'},{...options,author:{displayName:bad,color:'red'},bodyMarkup:quote,reactions:[{text:bad,count:1}]}));
 assert.equal(node.querySelector('img,[onclick],[onerror]'),null);
 assert.equal(node.querySelector('.author-name').getAttribute('style'),null);
 assert.equal(node.querySelector('.chat-message-quote').getAttribute('style'),null);
 assert.equal(node.querySelector('.chat-message-quote span').textContent,bad);
 assert.equal(isAuthorColor('#aBc123'),true);assert.equal(isAuthorColor('red'),false);
});

test('envelope preserves host bodies/actions and individual hours, hiding own avatar by default',()=>{
 const incoming=doc(renderChatMessage(first,{...options,actionsMarkup:'<button data-action="reply">Reply</button>',deliveryMarkup:'<i>ignored</i>'}));
 assert.equal(incoming.querySelector('.message-leading time').textContent,'10:30');
 assert.equal(incoming.querySelector('.message-body p').textContent,'Text');
 assert.ok(incoming.querySelector('.message-actions [data-action=reply]'));
 assert.equal(incoming.querySelector('i'),null);
 const outgoing={...first,direction:'outgoing'};
 assert.equal(doc(renderChatMessage(outgoing,options)).querySelector('.avatar'),null);
 assert.ok(doc(renderChatMessage(outgoing,{...options,showOutgoingAvatar:true})).querySelector('.avatar'));
 const next=doc(renderChatMessage({...first,messageId:'m2'},{...options,previousMessage:first}));
 assert.equal(next.querySelector('.author,.avatar,.message-day'),null);
 assert.equal(next.querySelectorAll('time').length,1);
});

test('unknown original stays readable and never makes links or requests',()=>{
 assert.equal(renderChatQuote(null),'');
 const node=doc(renderChatQuote({conversationId:'one',messageId:'missing',authorId:null,preview:{}}));
 assert.equal(node.querySelector('strong').textContent,'Mensagem citada');
 assert.equal(node.querySelector('span').textContent,'Conteúdo citado');
 assert.equal(node.querySelector('a,iframe,img'),null);
});

test('contextual controls wrap the original body and only show supplied metrics',()=>{
 const node=doc(renderChatMessage(first,{...options,contextualActions:true,actionsMarkup:'<button data-action="copy">Copiar</button>',metrics:{model:'<img src=x>',durationSeconds:0,inputTokens:0,outputTokens:-1,credits:2,creditsEstimated:true,cost:.5,currency:'USD',costEstimated:true}}));
 const content=node.querySelector('.chat-contextual-actions .chat-message-content');
 assert.ok(content.querySelector(':scope > .bubble .message-body p'));
 assert.ok(content.querySelector(':scope > .message-actions [data-action=copy]'));
 assert.equal(content.querySelector('.chat-actions-toggle').getAttribute('aria-expanded'),'false');
 const tooltip=content.querySelector('[role=tooltip]');
 assert.match(tooltip.textContent,/Modelo: <img src=x>.*Duração: 0 s.*Tokens de entrada: 0.*Créditos estimados: 2.*Custo estimado: 0.5 USD/);
 assert.doesNotMatch(tooltip.textContent,/Tokens de saída/);assert.equal(content.querySelector('img'),null);
 assert.equal(messageDetails({durationSeconds:Infinity,inputTokens:1.2,cost:4,currency:'usd'}),'');
 assert.equal(doc(renderChatMessage(first,options)).querySelector('.chat-message-content,.chat-actions-toggle,.chat-message-insights'),null);
 assert.equal(doc(renderChatMessage(first,{...options,contextualActions:true})).querySelector('.chat-actions-toggle'),null);
});

test('touch action toggle and metadata Escape are local, keyboard accessible and disposable',()=>{
 const node=doc(renderChatMessage(first,{...options,contextualActions:true,actionsMarkup:'<button data-action="copy">Copiar</button>',metrics:{durationSeconds:1}}));
 const window=node.defaultView,root=node.body,dispose=bindConversationInteractions(root);
 const toggle=node.querySelector('.chat-actions-toggle'),action=node.querySelector('[data-action=copy]'),insight=node.querySelector('.chat-message-insights');
 toggle.click();assert.equal(toggle.getAttribute('aria-expanded'),'true');
 action.focus();action.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
 assert.equal(toggle.getAttribute('aria-expanded'),'false');assert.equal(node.activeElement,toggle);
 insight.focus();insight.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
 assert.equal(insight.dataset.detailsDismissed,'true');
 toggle.focus();assert.equal(insight.hasAttribute('data-details-dismissed'),false);
 dispose();dispose();toggle.click();assert.equal(toggle.getAttribute('aria-expanded'),'false');
});

test('metrics preserve real zero values and omit absent, malformed or negative values',()=>{
 assert.equal(messageDetails(null),'');assert.equal(messageDetails('untrusted'), '');
 assert.equal(messageDetails({model:' ',durationSeconds:-1,inputTokens:1.5,outputTokens:Infinity,credits:NaN,cost:1,currency:'usd'}),'');
 assert.equal(messageDetails({credits:0,cost:0,currency:'BRL'}),'Créditos: 0 · Custo: 0 BRL');
 assert.equal(messageDetails({outputTokens:0}),'Tokens de saída: 0');
});

test('external cancellation removes interaction listeners, including an already aborted signal',()=>{
 for(const alreadyAborted of [false,true]){
  const node=doc(renderChatMessage(first,{...options,contextualActions:true,actionsMarkup:'<button>Copiar</button>'}));
  const controller=new node.defaultView.AbortController();if(alreadyAborted)controller.abort();
  const dispose=bindConversationInteractions(node.body,{signal:controller.signal});controller.abort();
  const toggle=node.querySelector('.chat-actions-toggle');toggle.click();
  assert.equal(toggle.getAttribute('aria-expanded'),'false');dispose();node.defaultView.close();
 }
});
