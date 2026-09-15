import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({headless:true});
const page=await browser.newPage();const errors=[],external=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:4173/')&&!r.url().startsWith('blob:'))external.push(r.url());});
try{
 await page.goto('http://127.0.0.1:4173/절차/작성.html');
 await page.locator('#goal').fill('받을 돈이 있는지 상담하고 싶어요');
 await page.locator('#role').fill('돈을 보낸 사람');
 await page.getByRole('button',{name:'있었던 일 정리하기 →'}).click();
 await page.locator('#date-0').fill('8월쯤');
 await page.locator('#text-0').fill('<script>alert(1)</script>라는 문자를 받았습니다.');
 await page.locator('#evidence-0').fill('문자 대화');
 await page.getByRole('button',{name:'초안 확인하기 →'}).click();
 assert.ok((await page.locator('#draft').textContent()).includes('<script>'));
 assert.ok(await page.getByRole('button',{name:'초안 내려받기 (.txt)'}).isDisabled());
 await page.locator('#confirm').check();
 const downloadPromise=page.waitForEvent('download');
 await page.getByRole('button',{name:'초안 내려받기 (.txt)'}).click();
 const download=await downloadPromise;assert.ok(download.suggestedFilename().endsWith('.txt'));
 await page.getByRole('button',{name:'← 이전 내용 수정'}).click();
 assert.equal(await page.locator('#date-0').inputValue(),'8월쯤');
 await page.locator('#text-0').fill('입력 내용을 고쳤습니다.');
 await page.getByRole('button',{name:'초안 확인하기 →'}).click();
 assert.equal(await page.locator('#confirm').isChecked(),false);
 for(const width of [320,375,768,1280]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
 await page.setViewportSize({width:375,height:900});
 await page.screenshot({path:'/private/tmp/writing-preview.png',fullPage:true});
 await page.reload();assert.equal(await page.locator('#goal').inputValue(),'');
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 console.log('PASS: guided writing, safe rendering, review gate, download, editing, mobile, clear-on-reload, no external requests');
}finally{await browser.close();}
