import test from 'node:test';
import assert from 'node:assert/strict';
import {blank,draft,issues} from '../절차/writing-model.mjs';
test('missing facts stay unknown, no inferred legal claims',()=>{
 const data=blank();data.events[0].text='돈을 보냈습니다.';
 const output=draft(data);
 assert.ok(output.includes('[미확인]'));
 assert.ok(output.includes('돈을 보냈습니다.'));
 assert.ok(!output.includes('사기죄'));
 assert.equal(data.confirmed,false);
 assert.equal(issues(data).length,4);
});
test('approximate dates and user words preserved verbatim',()=>{
 const data=blank();data.events=[{date:'8월쯤',text:'상대방에게 들은 말입니다.',evidence:'문자 대화'}];
 assert.ok(draft(data).includes('8월쯤'));
 assert.ok(draft(data).includes('상대방에게 들은 말입니다.'));
 assert.ok(!draft(data).includes('2026-08-01'));
});
test('review status does not assert legal approval',()=>{
 const data=blank();data.confirmed=true;
 assert.ok(draft(data).includes('법률 검수 아님'));
});
test('impossible dates and reverse order are flagged, not fixed',()=>{
 const data=blank();data.events=[{date:'2026-09-10',text:'첫 입력',evidence:''},{date:'2026-02-30',text:'두 번째 입력',evidence:''}];
 assert.ok(issues(data).some(s=>s.includes('달력')));
 assert.ok(issues(data).some(s=>s.includes('앞 항목보다')));
 assert.ok(draft(data).includes('2026-02-30'));
});
