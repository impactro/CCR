/** Presentation projection only; IDs are opaque and never grant access.
 * @typedef {Object} ChatMessage
 * @property {string} conversationId
 * @property {string} messageId
 * @property {string|null} authorId
 * @property {'incoming'|'outgoing'} direction
 * @property {'user'|'assistant'|'system'} role
 * @property {number} createdAt Epoch milliseconds UTC.
 * @property {Array<object>} parts Ordered parts of ONE message.
 * @property {boolean=} edited
 * @property {boolean=} breakBefore
 * @property {boolean=} breakAfter
 * @property {{conversationId:string,messageId:string,authorId:string|null,preview:object}=} replyTo
 * @property {string=} requestId
 * @property {string=} attemptId
 */
export const DEFAULT_TIME_ZONE='America/Sao_Paulo';
const valid=value=>Number.isSafeInteger(value)&&value>0;
export function messageTime(createdAt,{timeZone=DEFAULT_TIME_ZONE,locale='pt-BR'}={}){
 return valid(createdAt)?new Intl.DateTimeFormat(locale,{timeZone,hour:'2-digit',minute:'2-digit'}).format(createdAt):'';
}
export function messageDay(createdAt,{timeZone=DEFAULT_TIME_ZONE,locale='pt-BR'}={}){
 return valid(createdAt)?new Intl.DateTimeFormat(locale,{timeZone,dateStyle:'short'}).format(createdAt):'';
}
export function sequenceFor(message,previous,options={}){
 const day=messageDay(message.createdAt,options);
 const sameDay=Boolean(day&&message.conversationId&&message.conversationId===previous?.conversationId&&day===messageDay(previous.createdAt,options));
 const continuation=Boolean(sameDay&&message.authorId&&message.authorId===previous.authorId&&message.direction===previous.direction&&message.role!=='system'&&previous.role!=='system'&&!message.breakBefore&&!previous.breakAfter);
 return {date:sameDay?'':day,continuation};
}
/** Per-view state; the host supplies an authorized, account-scoped conversationId. */
export function createConversationState(){
 const states=new Map();let activeConversationId=null;
 const get=id=>{if(typeof id!=='string'||!id)throw Error('conversationId obrigatório');if(!states.has(id))states.set(id,{draft:'',scrollTop:0,viewer:null});return states.get(id);};
 return {get,get activeConversationId(){return activeConversationId;},select(id){const state=get(id);activeConversationId=id;return state;},remove(id){states.delete(id);if(activeConversationId===id)activeConversationId=null;},clear(){states.clear();activeConversationId=null;}};
}
