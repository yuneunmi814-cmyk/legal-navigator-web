// Run with PLAYWRIGHT_MODULE pointing to an installed playwright/index.mjs.
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:375,height:812}});
const errors=[], external=[], writes=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('request',request=>{
  if(/^https?:/.test(request.url())&&!request.url().startsWith('http://127.0.0.1:4173/'))external.push(request.url());
  if(request.method()!=='GET')writes.push(request.method());
});
try{
  const csp=readFileSync('_headers','utf8').match(/Content-Security-Policy: (.+)/)[1];
  let cspApplied=false;
  await page.route(url=>decodeURIComponent(url.pathname)==='/절차/',async route=>{
    const response=await route.fetch();
    await route.fulfill({response,headers:{...response.headers(),'content-security-policy':csp}});
    cspApplied=true;
  });
  await page.goto('http://127.0.0.1:4173/절차/');
  await page.getByRole('button',{name:'PDF 파일 넣기'}).click();
  await page.locator('#pdf-file').setInputFiles(resolve('brochure/housing.pdf'));
  await page.getByText('입력·인식한 원문과 대조하세요').waitFor({timeout:60000});
  assert.ok((await page.locator('pre').textContent()).includes('1쪽'));
  console.log('real text PDF: passed');
  await page.getByRole('button',{name:'처음부터'}).click();
  await page.getByRole('button',{name:'PDF 파일 넣기'}).click();
  await page.locator('#pdf-file').setInputFiles({name:'broken.pdf',mimeType:'application/pdf',buffer:Buffer.from('not a pdf')});
  await page.getByText('PDF 형식이 아닙니다.',{exact:false}).waitFor();
  assert.equal(await page.locator('#pdf-file').isDisabled(),false);
  console.log('bad PDF and retry: passed');
  if(process.env.PYTHON_EXECUTABLE){
    const encrypted=spawnSync(process.env.PYTHON_EXECUTABLE,['-c','from pypdf import PdfReader,PdfWriter; import sys,io; w=PdfWriter(); w.append(PdfReader("brochure/housing.pdf")); w.encrypt("test-only"); b=io.BytesIO(); w.write(b); sys.stdout.buffer.write(b.getvalue())']);
    assert.equal(encrypted.status,0,encrypted.stderr.toString());
    await page.locator('#pdf-file').setInputFiles({name:'locked.pdf',mimeType:'application/pdf',buffer:encrypted.stdout});
    await page.getByText('암호가 걸렸거나 읽을 수 없는 PDF입니다.',{exact:false}).waitFor({timeout:15000});
    console.log('password PDF rejected: passed');
  }
  await page.getByRole('button',{name:'처음부터'}).click();
  await page.getByRole('button',{name:'받은 종이를 사진으로 넣기'}).click();
  const picture=await page.evaluate(()=>{
    const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=500;
    const context=canvas.getContext('2d');context.fillStyle='white';context.fillRect(0,0,1200,500);
    context.fillStyle='black';context.font='72px sans-serif';context.fillText('약식명령',80,150);
    context.font='48px sans-serif';context.fillText('정식재판청구 안내',80,250);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.locator('#file').setInputFiles({name:'test.png',mimeType:'image/png',buffer:Buffer.from(picture,'base64')});
  await page.getByText('이렇게 읽었습니다. 맞나요?',{exact:true}).waitFor({timeout:90000});
  const photoText=await page.locator('pre').textContent();
  assert.ok(photoText.trim().length>0);
  assert.equal(await page.locator('.dl').count(),0);
  assert.ok(await page.locator('.pick-b').filter({hasText:'약식명령'}).isVisible());
  console.log('real photo OCR and manual correction: passed; synthetic OCR:',photoText);
  if(process.env.PDF_LIB_MODULE){
    const {PDFDocument}=await import(process.env.PDF_LIB_MODULE);
    const pdf=await PDFDocument.create();
    const embedded=await pdf.embedPng(Buffer.from(picture,'base64'));
    pdf.addPage([600,250]).drawImage(embedded,{x:0,y:0,width:600,height:250});
    await page.getByRole('button',{name:'처음부터'}).click();
    await page.getByRole('button',{name:'PDF 파일 넣기'}).click();
    await page.locator('#pdf-file').setInputFiles({name:'scan.pdf',mimeType:'application/pdf',buffer:Buffer.from(await pdf.save())});
    await page.getByText('입력·인식한 원문과 대조하세요').waitFor({timeout:90000});
    assert.ok((await page.locator('pre').textContent()).includes('사진 인식'));
    assert.equal(await page.locator('.dl').count(),0);
    console.log('real scanned PDF OCR and confirmation gate: passed');
    const oversized=await PDFDocument.create();
    for(let i=0;i<11;i++)oversized.addPage();
    await page.getByRole('button',{name:'처음부터'}).click();
    await page.getByRole('button',{name:'PDF 파일 넣기'}).click();
    await page.locator('#pdf-file').setInputFiles({name:'eleven.pdf',mimeType:'application/pdf',buffer:Buffer.from(await oversized.save())});
    await page.getByText('10쪽 이하 PDF를 지원합니다.',{exact:false}).waitFor();
    console.log('over-limit PDF rejected without partial output: passed');
  }
  await page.getByRole('button',{name:'처음부터'}).click();
  await page.getByRole('button',{name:'받은 종이를 사진으로 넣기'}).click();
  await page.locator('#file').setInputFiles({name:'cancel.png',mimeType:'image/png',buffer:Buffer.from(picture,'base64')});
  await page.getByRole('button',{name:'처음부터'}).click();
  await page.waitForTimeout(1000);
  assert.ok(await page.getByText('어떻게 시작할까요?',{exact:true}).isVisible());
  console.log('photo cancel cannot replace new screen: passed');
  await page.getByRole('button',{name:'받은 서류·문자 내용을 붙여넣기'}).click();
  await page.getByLabel('문서 제목과 안내 내용').fill('약식명령 2026고약1234');
  await page.getByRole('button',{name:'문서 종류 확인하기'}).click();
  await page.locator('.pick-b').filter({hasText:'약식명령'}).click();
  await page.locator('#pd').fill('2026-09-01');
  await page.locator('#pdgo').click();
  await page.getByText('법률 검수와 공휴일 검증이 완료되지 않아',{exact:false}).waitFor();
  assert.equal(await page.locator('.dl').count(),0);
  for(const width of [320,375,768,1280]){
    await page.setViewportSize({width,height:900});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  }
  await page.setViewportSize({width:375,height:900});
  await page.screenshot({path:'/private/tmp/legal-document-review.png',fullPage:true});
  assert.equal(cspApplied,true);assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.deepEqual(writes,[]);
  console.log('date gate, mobile widths, no external transfer: passed');
}finally{await browser.close();}
