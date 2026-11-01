import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {copyText} from '../../src/clipboard.mjs';
import {richDocumentText} from '../../src/document-renderer.mjs';

test('copy sends plain text to the clipboard and never HTML',async()=>{
 const writes=[];assert.equal(await copyText('<strong>Text</strong>',{clipboard:{writeText:async text=>writes.push(text)}}),true);assert.deepEqual(writes,['<strong>Text</strong>']);
 assert.equal(await copyText('',{clipboard:{writeText:()=>assert.fail()}}),false);
});
test('fallback restores draft focus/selection after denied clipboard permission',async()=>{
 const dom=new JSDOM('<textarea id="draft">unsent draft</textarea>'),document=dom.window.document,draft=document.querySelector('textarea');draft.focus();draft.setSelectionRange(2,5);
 document.execCommand=command=>{assert.equal(command,'copy');assert.equal(document.activeElement.value,'Copied text');return true;};
 assert.equal(await copyText('Copied text',{clipboard:{writeText:async()=>{throw Error('denied');}},document}),true);
 assert.equal(document.querySelectorAll('textarea').length,1);assert.equal(document.activeElement,draft);assert.equal(draft.value,'unsent draft');assert.deepEqual([draft.selectionStart,draft.selectionEnd],[2,5]);
 document.execCommand=()=>false;assert.equal(await copyText('Again',{clipboard:null,document}),false);dom.window.close();
});
test('rich table copy preserves rows as TSV and HTML copy drops active content',()=>{
 const dom=new JSDOM(''),document=dom.window.document,header={owner:'CES',format:'ccr.document',version:1,renderer:{name:'CCR',version:1},title:'Title'};
 assert.equal(richDocumentText({...header,type:'data',view:'table',data:{columns:[{label:'N',type:'number'},{label:'Active',type:'boolean'}],rows:[[0,false],[null,true]]}},{document}),'Title\nN\tActive\n0\tNão\nSem dado\tSim');
 assert.equal(richDocumentText({...header,type:'html',data:{html:'<p>Text</p><script>evil()</script><style>body{}</style>'}},{document}),'Text');dom.window.close();
});
