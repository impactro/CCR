import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {renderChatMessage,renderChatQuote,isAuthorColor} from '../src/conversation.mjs';

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
