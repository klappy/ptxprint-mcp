import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const workflow=readFileSync(new URL('../.github/workflows/engine-update.yml',import.meta.url),'utf8');
const script=workflow.slice(workflow.lastIndexOf('        run: |')+'        run: |'.length).split('\n').map(l=>l.startsWith('          ')?l.slice(10):l).join('\n').replace(/\$\{\{ github.repository \}\}/g,'test/repo').replace(/\$\{\{ github.event.repository.default_branch \}\}/g,'main');
function run(extra={}) {
 const d=mkdtempSync(join(tmpdir(),'engine-recovery-'));mkdirSync(join(d,'bin'));
 const mock=`#!/usr/bin/env node\nconst fs=require('fs');const args=process.argv.slice(2),cmd=require('path').basename(process.argv[1]);fs.appendFileSync(process.env.TRACE,cmd+' '+args.join(' ')+'\\n');if(cmd==='git'&&args[0]==='ls-remote')process.exit(Number(process.env.STATUS));if(cmd==='git'&&args[0]==='show')console.log(process.env.EXISTING_LOCK||'{}');if(cmd==='gh'&&args[0]==='api')console.log(process.env.OPEN||'');`;
 for(const c of ['git','gh'])writeFileSync(join(d,'bin',c),mock,{mode:0o755});
 writeFileSync(join(d,'engine-lock.json'),'{}\n');
 const p=spawnSync('bash',['-c',script],{cwd:d,encoding:'utf8',env:{...process.env,PATH:join(d,'bin')+':'+process.env.PATH,TRACE:join(d,'trace'),STATUS:'2',BRANCH:'engine-candidate/3.2.0-abc',...extra}});
 const trace=readFileSync(join(d,'trace'),'utf8');rmSync(d,{recursive:true,force:true});return {status:p.status,trace,stderr:p.stderr};
}
test('new candidate pushes, drafts and dispatches',()=>{const r=run();assert.equal(r.status,0,r.stderr);assert.match(r.trace,/git push/);assert.match(r.trace,/gh pr create/);assert.match(r.trace,/gh workflow run/)});
test('interrupted after push repairs missing PR without rewriting branch',()=>{const r=run({STATUS:'0'});assert.equal(r.status,0,r.stderr);assert.doesNotMatch(r.trace,/git push/);assert.match(r.trace,/gh pr create/);assert.match(r.trace,/gh workflow run/)});
test('existing matching PR retries dispatch',()=>{const r=run({STATUS:'0',OPEN:'engine-candidate/3.2.0-abc'});assert.equal(r.status,0,r.stderr);assert.doesNotMatch(r.trace,/gh pr create|git push/);assert.match(r.trace,/gh workflow run/)});
test('another open candidate is left alone',()=>{const r=run({OPEN:'engine-candidate/3.1.9-old'});assert.equal(r.status,0,r.stderr);assert.doesNotMatch(r.trace,/git push|gh workflow run|gh pr create/)});
test('remote failure and differing branch fail closed',()=>{for(const env of [{STATUS:'128'},{STATUS:'0',EXISTING_LOCK:'{"changed":true}'}]){const r=run(env);assert.notEqual(r.status,0);assert.doesNotMatch(r.trace,/git push|gh workflow run|gh pr create/)}});
