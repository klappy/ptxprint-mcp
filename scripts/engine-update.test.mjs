import {test} from 'node:test';
import assert from 'node:assert/strict';
import {candidate,selectTag} from './engine-update.mjs';
const tag=n=>({name:n,commit:{sha:'a'.repeat(40)}});
const lock={schema:1,ptxprint:{version:'3.1.6',commit:'b'.repeat(40)},usfmtc:{commit:'c'.repeat(40)},render_revision:1};
test('numeric not lexical semver, no prerelease',()=>assert.equal(selectTag(['3.1.7','3.1.10','4.0.0-rc1'].map(tag),'3.1.6').name,'3.1.10'));
test('no downgrade/equal/tag-move promotion',()=>assert.equal(candidate(lock,['3.1.5','3.1.6'].map(tag)),null));
test('preserve explicit usfmtc/revision and immutable commit',()=>{const n=candidate(lock,[tag('v3.2.0')]);assert.deepEqual(n.usfmtc,lock.usfmtc);assert.equal(n.render_revision,1);assert.equal(n.ptxprint.commit,'a'.repeat(40));assert.equal(n.ptxprint.version,'3.2.0')});
test('invalid commits rejected',()=>assert.equal(candidate(lock,[{name:'9.0.0',commit:{sha:'main'}}]),null));
