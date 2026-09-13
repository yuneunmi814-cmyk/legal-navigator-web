import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

const html=readFileSync(new URL('../절차/index.html',import.meta.url),'utf8');
const script=html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
function setup(){
  const nodes=new Map();
  const node=key=>{
    if(!nodes.has(key)) nodes.set(key,{innerHTML:'',textContent:'',value:'',focus(){},append(){},querySelector:node});
    return nodes.get(key);
  };
  const context=vm.createContext({document:{querySelector:node,createElement:()=>node('created')},window:{scrollTo(){},addEventListener(){}},URL,Date,alert(){}});
  vm.runInContext(script,context);
  return {run:code=>vm.runInContext(code,context),node};
}
test('starts with photo, pasted text and manual input',()=>{
  const {node}=setup();
  for(const label of ['사진으로','붙여넣기','직접 고르기']) assert.ok(node('#app').innerHTML.includes(label));
});
test('ambiguous and civil documents are not guessed as criminal documents',()=>{
  const {run}=setup();
  assert.equal(run('판독("약식명령 정식재판청구").문서'),'약식명령');
  assert.equal(run('판독("약식명령 공소장").문서'),null);
  assert.equal(run('판독("2026가단1234 판결").범위밖'),true);
  assert.equal(run('판독("알 수 없는 서류").문서'),null);
});
test('source text is escaped, no HTML execution',()=>{
  const {run,node}=setup();
  run('판독확인(판독("약식명령 <img src=x onerror=alert(1)>"))');
  assert.ok(node('#app').innerHTML.includes('&lt;img'));
  assert.ok(!node('#app').innerHTML.includes('<img src=x'));
});
test('judgment title alone cannot enter deadline calculation',()=>{
  const {run,node}=setup();
  run('문서선택("판결문",null)');
  assert.ok(node('#app').innerHTML.includes('확정할 수 없습니다'));
  assert.equal(run('Object.keys(담은날짜).length'),0);
});
test('pasted text requires user selection and an explicit date',()=>{
  const {run,node}=setup();
  run('글화면()');
  node('#document-text').value='약식명령 2026고약1234 2026.09.01';
  node('#read-text').onclick();
  assert.ok(node('#app').innerHTML.includes('직접 선택'));
  assert.equal(run('Object.keys(담은날짜).length'),0);
  run('문서선택("약식명령",null)');
  assert.ok(node('#app').innerHTML.includes('정확한 날짜를 모르겠어요'));
});
test('restart clears dates and invalidates pending OCR',()=>{
  const {run}=setup();
  run('담은날짜.a="2026-01-01"');
  const before=run('읽기세대');
  run('시작()');
  assert.ok(run('읽기세대')>before);
  assert.equal(run('Object.keys(담은날짜).length'),0);
});
test('document page has no analytics beacon or input upload code',()=>{
  assert.ok(!html.includes('cloudflareinsights'));
  assert.ok(!/fetch\(|localStorage|sendBeacon/.test(script));
});
test('invalid and future dates are rejected',()=>{
  const {run}=setup();
  for(const date of ['2026-02-30','2026-13-01','2100-01-01','bad',''])assert.equal(run(`유효날짜(${JSON.stringify(date)})`),false);
  assert.equal(run('유효날짜("2024-02-29")'),true);
});
test('all legacy leaf and date nodes fail closed without review',()=>{
  const {run,node}=setup();
  const ids=run('Object.keys(D.노드).filter(id=>["date","leaf"].includes(D.노드[id].type))');
  for(const id of ids){
    run(`현재id=${JSON.stringify(id)};그리기(D.노드[현재id])`);
    assert.ok(node('#app').innerHTML.includes('법률 검수'),id);
    assert.ok(!node('#app').innerHTML.includes('일 남았습니다'),id);
  }
});
test('expired review and unverified holidays do not enable calculation',()=>{
  const {run}=setup();
  run('법률검수.reviewedBy="test";법률검수.approvedNodes=["A2"];법률검수.validUntil="2020-01-01"');
  assert.equal(run('검수통과("A2")'),false);
  assert.throws(()=>run('마감계산("2026-01-01",D.기한규칙.항소)'),/공휴일/);
});
