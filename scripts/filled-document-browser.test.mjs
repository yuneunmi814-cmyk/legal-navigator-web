import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');const base=process.env.TEST_BASE||'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true});const page=await browser.newPage();const errors=[],posts=[];
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()==='POST')posts.push(r.url());});
try{
 await page.goto(base+'/절차/');await page.locator('[data-go="글"]').click();await page.locator('#document-text').fill('서울중앙지방법원\n지 급 명 령\n사건 2026 차전 12345\n채권자 : 홍길동\n채무자 : 김예시\n채무자는 채권자에게 100만원을 지급하라.\n송달받은 날부터 2주 이내 이의신청\n2026. 9. 1.');await page.locator('#read-text').click();await page.locator('#intake-start').click();
 assert.equal(await page.locator('#intake-title').inputValue(),'지급명령');assert.equal(await page.locator('#intake-creditor').inputValue(),'홍길동');assert.equal(await page.locator('#intake-received').inputValue(),'');
 await page.getByRole('button',{name:'추출 근거 보기'}).first().click();assert.ok((await page.locator('mark').textContent()).includes('명'));
 await page.locator('#intake-role').fill('채무자');await page.locator('#intake-consent').check();await page.getByRole('button',{name:'확인한 내용으로 작성 이어가기'}).click();
 await page.getByRole('button',{name:'있었던 일 정리하기 →'}).click();await page.locator('#payment-choice').selectOption('object');await page.getByRole('button',{name:'초안 확인하기 →'}).click();
 assert.equal(await page.locator('#form-caseNumber').inputValue(),'2026차전12345');assert.equal(await page.locator('#form-creditor').inputValue(),'홍길동');assert.equal(await page.locator('#form-debtor').inputValue(),'김예시');assert.equal(await page.locator('#form-scope').inputValue(),'');
 await page.locator('#form-address').fill('테스트 주소');await page.locator('#form-received').fill('2026-02-31');assert.ok((await page.locator('#payment-missing').textContent()).includes('달력'));
 await page.locator('#form-received').fill('2026-09-10');await page.locator('#form-scope').selectOption('partial');assert.ok((await page.locator('#payment-missing').textContent()).includes('일부 이의'));
 await page.locator('#form-partial').fill('청구금액 중 10만원');await page.locator('#payment-confirm').check();await page.locator('#form-contact').fill('미기재');assert.equal(await page.locator('#payment-confirm').isChecked(),false);
 await page.locator('#payment-confirm').check();const pending=page.waitForEvent('download');await page.getByRole('button',{name:'채워진 작성본 내려받기 (.html)'}).click();const dl=await pending;const html=await readFile(await dl.path(),'utf8');assert.ok(html.includes('2026차전12345'));assert.ok(html.includes('홍길동'));assert.ok(html.includes('청구금액 중 10만원'));assert.ok(html.includes('검토용'));assert.ok(!html.includes('<script'));
 await page.getByRole('button',{name:'← 이전 내용 수정'}).click();await page.getByRole('button',{name:'초안 확인하기 →'}).click();assert.equal(await page.locator('#form-address').inputValue(),'테스트 주소');assert.equal(await page.locator('#payment-confirm').isChecked(),false);
 for(const width of [320,375,768,1280]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
 await page.setViewportSize({width:375,height:900});await page.locator('#payment-document').screenshot({path:'/private/tmp/filled-document-mobile.png'});
 await page.evaluate(()=>document.body.classList.add('payment-print'));await page.emulateMedia({media:'print'});assert.ok(await page.locator('#payment-preview').isVisible());assert.ok(!await page.locator('#form-caseNumber').isVisible());assert.ok(!await page.locator('#draft').isVisible());await page.emulateMedia({media:'screen'});await page.evaluate(()=>document.body.classList.remove('payment-print'));
 assert.deepEqual(errors,[]);assert.deepEqual(posts,[]);console.log('PASS: extraction evidence → consent → prefilled document → actual download, partial scope, date warning, edit retention, print-only document, mobile, no POST');
}finally{await browser.close();}
