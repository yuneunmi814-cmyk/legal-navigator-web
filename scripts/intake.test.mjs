import test from 'node:test';import assert from 'node:assert/strict';
import {pack,unpack,clean} from '../절차/intake-model.mjs';
test('intake only transfers allowed fields, no source text',()=>{const p=unpack(pack({title:'지급명령',source:'secret',caseNumber:'2026차전123'},100),100);assert.equal(p.source,undefined);assert.equal(p.caseNumber,'2026차전123');});
test('expired, future and malformed handoffs are rejected',()=>{assert.equal(unpack(pack({},100),300101),null);assert.equal(unpack(pack({},100),99),null);assert.equal(unpack('bad'),null);assert.equal(unpack(null),null);});
test('field limits and hostile object values',()=>{assert.equal(clean({title:'a'.repeat(2000)}).title.length,1500);assert.equal(clean({title:{x:1}}).title,'');});
