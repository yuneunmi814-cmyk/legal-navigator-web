import test from 'node:test';import assert from 'node:assert/strict';
import {extract} from '../절차/extract.mjs';import {blank,draft,issues} from '../절차/writing-model.mjs';
test('exact general headings are candidates, not inferred from prose',()=>{
 for(const title of ['내용증명','소장','판결문','약식명령','보정명령','출석요구서','불송치결정통지서']){const source='기관\n'+title+'\n내용';const found=extract(source).title;assert.equal(found.value,title);assert.equal(source.slice(found.start,found.end),found.quote);}
 assert.equal(extract('내용증명을 보내겠다고 말했습니다.').title,undefined);
 assert.ok(extract('지급명령\n판결문').title.ambiguous);assert.ok(extract('지급명령\n지급명령신청서').title.ambiguous);
});
test('multiple events preserve user order and Korean document labels',()=>{
 const data=blank();data.events=[{text:'돈을 보냄',date:'9월쯤',evidence:'이체 내역'},{text:'문자를 받음',date:'기억 안 남',evidence:'문자'}];data.intake={creditor:'상대방',debtor:'본인'};
 const text=draft(data);assert.ok(text.indexOf('돈을 보냄')<text.indexOf('문자를 받음'));assert.ok(text.includes('채권자: 상대방'));assert.ok(!text.includes('creditor:'));assert.ok(text.includes('2번째 일 관련: 문자'));assert.ok(!issues(data).some(x=>x.includes('날짜는 미확인')));
});
