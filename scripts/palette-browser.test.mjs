import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true});
const base=process.env.TEST_BASE||'http://127.0.0.1:4173';
const rgb=s=>s.match(/[\d.]+/g).slice(0,3).map(Number);
const luminance=s=>rgb(s).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);
const contrast=(a,b)=>(Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05);
try{
 for(const mode of ['light','dark']){
  const page=await browser.newPage({colorScheme:mode});
  for(const route of ['/', '/절차/간편.html?entry=situation']){
   await page.goto(base+route);
   const home=route==='/';
   const selector=home?'.site-nav .nav-start':'.primary';
   const colors=await page.locator(selector).first().evaluate(el=>{const s=getComputedStyle(el);return {fg:s.color,bg:s.backgroundColor};});
   assert.equal(colors.bg,mode==='light'?'rgb(49, 95, 181)':'rgb(55, 100, 180)');
   assert.ok(contrast(colors.fg,colors.bg)>=4.5,JSON.stringify(colors));
   const link=await page.locator(home?'.journey-links a':'header a').first().evaluate(el=>getComputedStyle(el).color);
   assert.equal(link,mode==='light'?'rgb(49, 95, 181)':'rgb(163, 190, 245)');
   assert.ok((await page.locator('.business-info').innerText()).includes('충청북도 제천시'));
   for(const width of [320,375,1280]){
    await page.setViewportSize({width,height:900});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    if(width!==320)await page.screenshot({path:`/private/tmp/blue-${home?'home':'writing'}-${mode}-${width}.png`});
   }
   if(!home){await page.emulateMedia({media:'print'});assert.equal(await page.locator('body').evaluate(el=>getComputedStyle(el).color),'rgb(23, 41, 65)');assert.equal(await page.locator('body').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(255, 255, 255)');}
  }
  await page.close();
 }
 console.log('PASS: blue palette, button contrast ≥4.5, mobile/dark, city-only footer present, dark-mode print');
}finally{await browser.close();}
