import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.TEST_BASE||'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true});const page=await browser.newPage();const errors=[],posts=[];
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()==='POST')posts.push(r.url());});
try{
 await page.goto(base+'/절차/');await page.locator('[data-go="글"]').click();
 await page.locator('#document-text').fill('지급명령 2026차전1234 서울중앙지방법원 <script>alert(1)</script>');await page.locator('#read-text').click();await page.locator('#intake-start').click();
 await page.locator('#intake-title').fill('지급명령');await page.locator('#intake-court').fill('서울중앙지방법원');await page.locator('#intake-caseNumber').fill('2026차전1234');await page.locator('#intake-role').fill('채무자');
 assert.ok(await page.getByRole('button',{name:'확인한 내용으로 작성 이어가기',exact:true}).isDisabled());
 await page.locator('#intake-consent').check();await page.locator('#intake-request').fill('100만원을 지급하라는 내용');assert.equal(await page.locator('#intake-consent').isChecked(),false);
 await page.locator('#intake-consent').check();await page.getByRole('button',{name:'확인한 내용으로 작성 이어가기',exact:true}).click();
 await page.locator('#received-title').waitFor();assert.equal(await page.locator('#received-caseNumber').inputValue(),'2026차전1234');assert.equal(await page.evaluate(()=>sessionStorage.getItem('legalnavi-confirmed-intake-v1')),null);
 await page.getByRole('button',{name:'있었던 일 정리하기 →'}).click();await page.locator('#payment-choice').selectOption('object');await page.locator('#objection').fill('이체 내역을 확인하고 싶습니다.');
 await page.getByRole('button',{name:'초안 확인하기 →'}).click();assert.ok((await page.locator('#form-guide').textContent()).includes('2026차전1234'));
 assert.ok((await page.locator('#draft').textContent()).includes('100만원'));assert.ok(await page.getByRole('button',{name:'초안 내려받기 (.txt)'}).isDisabled());
 for(const width of [320,375,768,1280]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
 await page.getByRole('button',{name:'← 이전 내용 수정'}).click();await page.getByRole('button',{name:'← 이전 내용 수정'}).click();await page.locator('#received-title').fill('다른 문서');await page.getByRole('button',{name:'있었던 일 정리하기 →'}).click();assert.equal(await page.locator('#payment-choice').count(),0);
 await page.locator('#text-0').fill('서류를 받았습니다');await page.getByRole('button',{name:'초안 확인하기 →'}).click();assert.equal(await page.locator('#form-guide').count(),0);
 await page.reload();assert.equal(await page.locator('#received-title').count(),0);assert.deepEqual(errors,[]);assert.deepEqual(posts,[]);
 console.log('PASS: consent → one-use transfer → payment choice → field guide, stale choice reset, mobile, no POST');
}finally{await browser.close();}
