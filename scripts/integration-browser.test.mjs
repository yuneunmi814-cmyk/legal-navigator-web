import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base=process.env.TEST_BASE || 'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage();const errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(base);
 for(const width of [320,375,768,1280]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
 await page.getByRole('link',{name:'작성 도움 시작하기 →',exact:true}).click();
 await page.locator('#goal').waitFor();
 assert.match(decodeURI(new URL(page.url()).pathname),/^\/절차\/작성(?:\.html)?$/);
 await page.locator('#goal').fill('내 상황을 정리하고 싶어요');
 const popup=page.waitForEvent('popup');
 await page.getByRole('link',{name:'작성한 내용은 유지하고, 새 탭에서 서식 찾기 →'}).click();
 const forms=await popup;await forms.waitForLoadState();
 assert.ok(await forms.locator('#flist .fitem').count()>100);
 assert.equal(await page.locator('#goal').inputValue(),'내 상황을 정리하고 싶어요');
 await forms.close();
 await page.getByText('안내가 맞지 않거나 사용하기 어려웠나요?',{exact:true}).click();
 await page.getByRole('button',{name:'필요한 도움까지 막힘',exact:true}).click();
 assert.ok((await page.locator('#feedback-status').textContent()).includes('필요한 도움까지 막힘'));
 assert.ok(!(await page.locator('#feedback-status').textContent()).includes('내 상황을 정리하고 싶어요'));
 assert.deepEqual(errors,[]);
 console.log('PASS: home → writing → forms, preserves writing, private feedback, responsive home');
}finally{await browser.close();}
