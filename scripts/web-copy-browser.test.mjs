import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true});const page=await browser.newPage();
const base=process.env.TEST_BASE||'http://127.0.0.1:4173';const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
await page.goto(base);assert.equal(await page.locator('.kakao-section').count(),0);assert.equal(await page.locator('.journey-links a').count(),2);
assert.ok(await page.getByRole('heading',{name:'지금 이용할 수 있어요'}).isVisible());
for(const mode of ['light','dark']){await page.emulateMedia({colorScheme:mode});for(const width of [320,375,768,1280]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);if([375,1280].includes(width))await page.screenshot({path:`/private/tmp/web-copy-${mode}-${width}.png`});}}
await page.getByText('기존 절차 안내의 수록 범위 보기',{exact:true}).click();assert.equal(await page.locator('#coverage-checked').innerText(),'2026-09-15');
await page.getByText('사진과 입력한 내용은 어디로 가나요?',{exact:true}).click();assert.ok((await page.locator('#faq').innerText()).includes('홈페이지에는 방문 통계'));
await page.goto(base+'/#ask-input');assert.ok(await page.locator('#ask-input').isVisible());
const img=await page.request.get(base+'/assets/web-share.png');assert.equal(img.status(),200);assert.ok(img.headers()['content-type'].includes('image/png'));assert.deepEqual(errors,[]);
if(base.startsWith('https://')){const shared=await page.request.get(await page.locator('meta[property="og:image"]').getAttribute('content'));assert.equal(shared.status(),200);assert.ok(shared.headers()['content-type'].includes('image/png'));}
console.log('PASS: scope labels, coverage disclosure, old deep links, sharing image, light/dark 320–1280px');
}finally{await browser.close();}
