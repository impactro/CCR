import {mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
mkdirSync(new URL('../.agents/temp/tests/',import.meta.url),{recursive:true});
const files=['contextual-views','progressive-history','conversation'];
const result=spawnSync(process.execPath,['--test','--experimental-test-coverage',
 ...files.map(name=>'--test-coverage-include=src/'+name+'.mjs'),
 '--test-coverage-lines=99','--test-coverage-branches=90','--test-coverage-functions=95',
 '--test-reporter=spec','--test-reporter-destination=stdout',
 '--test-reporter=lcov','--test-reporter-destination=.agents/temp/tests/unit.lcov',
 ...files.map(name=>'tests/unit/'+name+'.test.mjs')],{cwd:root,stdio:'inherit'});
if(result.error)throw result.error;
process.exitCode=result.status??1;
