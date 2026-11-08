import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
test('rich presentation has no inset frames or decorative side accents',()=>{
 for(const name of readdirSync(new URL('../../src/',import.meta.url)).filter(x=>x.endsWith('.css'))){
  const css=readFileSync(new URL('../../src/'+name,import.meta.url),'utf8');
  assert.doesNotMatch(css,/box-shadow\s*:[^;}]*\binset\b/i,name);
  assert.doesNotMatch(css,/border-(?:left|right|top|bottom|inline-start|inline-end)\s*:\s*(?:[2-9]|[1-9][0-9]+)px\b/i,name);
 }
 const css=readFileSync(new URL('../../src/data-view.css',import.meta.url),'utf8');
 assert.match(css,/:focus-visible\{outline:/);
 assert.match(css,/border-bottom:1px solid/);
});
