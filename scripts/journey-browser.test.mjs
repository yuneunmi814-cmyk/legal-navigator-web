import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true});const page=await browser.newPage();
const base=process.env.TEST_BASE||'http://127.0.0.1:4173';const errors=[],posts=[];
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()==='POST'&&!r.url().startsWith('https://cloudflareinsights.com/'))posts.push(r.url());});
try{
 await page.goto(base);assert.equal(await page.locator('.journey-links a').count(),2);assert.equal(await page.locator('#ask-input').isVisible(),false);
 for(const width of [320,375,768,1280]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
 await page.setViewportSize({width:375,height:900});await page.screenshot({path:'/private/tmp/journey-home.png',fullPage:true});
 await page.getByRole('link',{name:'어떤 일인지 설명할게요',exact:false}).click();
 await page.getByRole('button',{name:'정리한 내용 확인하기'}).click();assert.ok((await page.locator('#status').textContent()).includes('한 가지'));
 await page.locator('#story-goal').fill('상담 전 자료를 정리하고 싶어요');await page.locator('#story-text').fill('<script>alert(1)</script>라는 문자를 받았습니다.');
 await page.getByRole('button',{name:'정리한 내용 확인하기'}).click();assert.ok((await page.locator('.review-item summary').allTextContents()).some(t=>t.includes('<script>')));
 await page.locator('#story-check').check();await page.locator('.review-item').filter({hasText:'어떤 일이 있었나요?'}).locator('summary').click();await page.locator('#story-text').fill('돈을 보낸 뒤 연락을 받지 못했습니다.');assert.equal(await page.locator('#story-check').isChecked(),false);
 await page.locator('#story-check').check();await page.getByRole('button',{name:'상담 준비자료 만들기'}).click();
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'준비자료 내려받기 (.txt)'}).click();const text=await readFile(await(await download).path(),'utf8');assert.ok(text.includes('돈을 보낸 뒤'));assert.ok(text.includes('미확인'));assert.ok(text.includes('법률 검수 아님'));
 for(const width of [320,375,768,1280]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
 await page.screenshot({path:'/private/tmp/journey-result.png',fullPage:true});
 await page.goBack();assert.equal(await page.locator('#story-check').isChecked(),false);await page.locator('.review-item').filter({hasText:'어떤 일이 있었나요?'}).locator('summary').click();await page.locator('#story-text').fill('수정했습니다');await page.goForward();assert.equal(await page.getByRole('button',{name:'준비자료 내려받기 (.txt)'}).count(),0);
 await page.goto(base+'/절차/간편.html?entry=document');await page.getByText('파일 대신 글을 붙여넣을게요').click();await page.locator('#paste').fill('내용증명\n상대방의 요구입니다.');await page.getByRole('button',{name:'이 내용 확인하기',exact:true}).click();await page.getByRole('button',{name:'수정',exact:true}).first().click();await page.getByRole('textbox',{name:'문서 제목 수정'}).fill('내용증명');await page.getByRole('button',{name:'수정 반영'}).click();await page.locator('#facts-checked').check();await page.getByRole('button',{name:'이 내용으로 계속',exact:true}).click();await page.getByRole('button',{name:'정리한 내용 확인하기'}).click();await page.locator('#story-check').check();await page.getByRole('button',{name:'상담 준비자료 만들기'}).click();assert.ok((await page.locator('#draft-preview').textContent()).includes('내용증명'));
 await page.reload();assert.equal(await page.locator('#draft-preview').count(),0);assert.equal(await page.getByRole('button',{name:'사진 또는 PDF 선택'}).count(),1);
 await page.goto(base+'/#ask-input');assert.ok(await page.locator('#ask-input').isVisible());assert.deepEqual(errors,[]);assert.deepEqual(posts,[]);
 console.log('PASS: two entrances, factual packet, edits invalidate confirmation, actual download, general document, responsive, no POST');
}finally{await browser.close();}
