// Code-rendered sharing card: no third-party graphics, claims or external font requests.
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true});
try{const page=await browser.newPage({viewport:{width:1200,height:630},deviceScaleFactor:1});
await page.setContent(`<!doctype html><html lang="ko"><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;background:#f7f9fc;color:#172941;font-family:system-ui,-apple-system,sans-serif;padding:58px 72px}header{color:#315fb5;font-size:25px;font-weight:700;padding-bottom:26px;border-bottom:1px solid #e1e7ef}h1{font-size:58px;letter-spacing:-2px;line-height:1.35;margin:42px 0 28px}p{font-size:27px;color:#64738a;margin:0}footer{margin-top:42px;font-size:20px;color:#64738a}span{padding-right:25px}</style><header>프로젝트윤 · 법률 절차 길잡이</header><h1>받은 서류부터 내 상황까지,<br>하나씩 정리해요.</h1><p><span>받은 서류 확인</span> · <span>내 상황 정리</span> · 상담 준비자료</p><footer>사진 · PDF · 직접 입력으로 시작하세요</footer></html>`);
await page.screenshot({path:'assets/web-share.png'});
}finally{await browser.close();}
