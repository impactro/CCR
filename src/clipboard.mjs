/** Local plain-text copy, called only from a host's explicit user action. */
export async function copyText(text,{clipboard=globalThis.navigator?.clipboard,document=globalThis.document}={}){
 if(typeof text!=='string'||!text)return false;
 try{if(typeof clipboard?.writeText==='function'){await clipboard.writeText(text);return true;}}catch{}
 if(!document?.body||typeof document.execCommand!=='function')return false;
 const active=document.activeElement,start=active?.selectionStart,end=active?.selectionEnd,direction=active?.selectionDirection;
 const selection=document.getSelection?.(),ranges=selection?Array.from({length:selection.rangeCount},(_,i)=>selection.getRangeAt(i).cloneRange()):[];
 const field=document.createElement('textarea');field.value=text;field.readOnly=true;field.style.cssText='position:fixed;left:-10000px;top:0;opacity:0';
 let copied=false;
 try{document.body.append(field);field.focus({preventScroll:true});field.select();copied=document.execCommand('copy')===true;}catch{}
 finally{
  field.remove();
  try{if(active?.isConnected){active.focus({preventScroll:true});if(Number.isInteger(start)&&active.setSelectionRange)active.setSelectionRange(start,end,direction);}
   if(selection&&ranges.length){selection.removeAllRanges();for(const range of ranges)selection.addRange(range);}}catch{}
 }
 return copied;
}
