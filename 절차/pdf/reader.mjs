// PDF.js 5.6.205. Files and extracted text stay in browser memory.
import { getDocument, GlobalWorkerOptions } from './vendor/pdf.min.mjs';
GlobalWorkerOptions.workerSrc = new URL('./vendor/pdf.worker.min.mjs', import.meta.url).href;

export async function readPdf(file, {signal, progress=()=>{}, ocr}={}) {
  if(file.size>20*1024*1024) throw Error('PDF는 20MB 이하로 넣어 주세요.');
  const data=new Uint8Array(await file.arrayBuffer());
  if(signal?.aborted) throw Error('읽기를 취소했습니다.');
  if(!new TextDecoder().decode(data.slice(0,1024)).includes('%PDF-')) throw Error('PDF 형식이 아닙니다.');
  const task=getDocument({data,isEvalSupported:false,enableXfa:false,disableFontFace:true,
    useSystemFonts:true,cMapUrl:new URL('./vendor/cmaps/',import.meta.url).href,cMapPacked:true,
    standardFontDataUrl:new URL('./vendor/standard_fonts/',import.meta.url).href,
    stopAtErrors:true,maxImageSize:16000000,verbosity:0});
  const cancel=()=>{void task.destroy().catch(()=>{});};
  signal?.addEventListener('abort',cancel,{once:true});
  // No password retention or password bypass.
  task.onPassword=()=>{cancel();};
  try {
    const pdf=await task.promise;
    if(pdf.numPages>10) throw Error('10쪽 이하 PDF를 지원합니다. 필요한 문서를 나누어 넣어 주세요. 일부 페이지만 읽고 전체로 판단하지 않습니다.');
    const pages=[];
    let length=0;
    for(let i=1;i<=pdf.numPages;i++){
      if(signal?.aborted) throw Error('읽기를 취소했습니다.');
      progress(`${i}/${pdf.numPages}쪽 읽는 중`);
      const page=await pdf.getPage(i);
      const content=await page.getTextContent();
      let text=content.items.map(item=>item.str+(item.hasEOL?'\n':' ')).join('').trim();
      let method='텍스트';
      if(text.replace(/\s/g,'').length<20){
        if(!ocr) throw Error('스캔된 PDF입니다. 사진 입력을 이용해 주세요.');
        const base=page.getViewport({scale:1});
        const scale=Math.min(2,1800/Math.max(base.width,base.height));
        const viewport=page.getViewport({scale});
        const canvas=document.createElement('canvas');
        canvas.width=Math.ceil(viewport.width); canvas.height=Math.ceil(viewport.height);
        try{
          await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
          text=await ocr(canvas); method='사진 인식';
        }finally{canvas.width=canvas.height=0;}
      }
      if(!text.trim()) throw Error(`${i}쪽을 읽지 못했습니다. 다른 입력 방법을 이용해 주세요.`);
      length+=text.length;
      if(length>20000) throw Error('읽은 내용이 20,000자를 넘습니다. 필요한 부분을 직접 붙여넣어 주세요.');
      pages.push({page:i,text,method});
      page.cleanup();
    }
    return {pages,text:pages.map(p=>`[${p.page}쪽 · ${p.method}]\n${p.text}`).join('\n\n')};
  }finally{signal?.removeEventListener('abort',cancel); await task.destroy().catch(()=>{});}
}
