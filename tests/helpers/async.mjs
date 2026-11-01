/** Explicit completions make scope races deterministic; no timing sleeps. */
export function deferred(){
 let resolve,reject;
 const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});
 return {promise,resolve,reject};
}
export const flush=()=>new Promise(resolve=>setImmediate(resolve));
