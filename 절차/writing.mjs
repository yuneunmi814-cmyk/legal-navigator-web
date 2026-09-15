import {blank,draft} from './writing-model.mjs';
let data=blank(),step=0;
const $=id=>document.getElementById(id);
const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function field(id,label,value,placeholder='',single=false){const attrs=`id="${id}" maxlength="4000" placeholder="${placeholder}"`;return `<label for="${id}">${label}</label>`+(single?`<input ${attrs} value="${escape(value)}">`:`<textarea ${attrs}>${escape(value)}</textarea>`);}
function sync(){
  if(step===0)for(const key of ['goal','role','document'])data[key]=$(key).value;
  if(step===1){data.events.forEach((e,i)=>{for(const key of ['date','text','evidence'])e[key]=$(`${key}-${i}`).value;});data.questions=$('questions').value;}
}
function button(text,handler,primary=false){const b=document.createElement('button');b.textContent=text;if(primary)b.className='primary';b.onclick=handler;$('actions').append(b);return b;}
function render(){
  $('status').textContent='';$('actions').replaceChildren();$('review').hidden=step!==2;$('editor').hidden=step===2;
  $('progress').textContent=['1 / 3 · 원하는 도움','2 / 3 · 있었던 일과 자료','3 / 3 · 대조하고 내려받기'][step];
  if(step===0)$('editor').innerHTML=`<section><h2>어떤 도움을 원하시나요?</h2>${field('goal','원하는 해결이나 도움',data.goal,'예: 돈을 돌려받을 방법을 상담하고 싶어요')}${field('role','이 일에서 나는 어떤 사람인가요?',data.role,'예: 돈을 보낸 사람, 세입자, 통지를 받은 사람')}${field('document','받은 문서가 있나요? (선택)',data.document,'문서 제목만 적어도 됩니다. 없거나 모르면 비워 두세요')}</section>`;
  if(step===1){
    $('editor').innerHTML=`<section><h2>있었던 일을 하나씩 적어주세요</h2><p>직접 본 사실, 전해 들은 말, 자신의 생각을 구분해 주세요. 정확한 날짜가 기억나지 않으면 ‘8월쯤’처럼 적어도 됩니다. 자동으로 날짜를 추정하지 않습니다.</p>${data.events.map((e,i)=>`<div class="event"><h3>${i+1}번째 일</h3>${field(`date-${i}`,'언제 있었나요?',e.date,'예: 2026-08-10 / 8월쯤 / 기억나지 않음',true)}${field(`text-${i}`,'어떤 일이 있었나요?',e.text,'상대방의 의도를 단정하기보다 있었던 일을 적어주세요')}${field(`evidence-${i}`,'확인에 도움이 될 자료가 있나요?',e.evidence,'예: 이체 내역, 주고받은 문자. 파일을 올릴 필요는 없습니다.')}</div>`).join('')}<button id="add" ${data.events.length>=10?'disabled':''}>있었던 일 추가 (최대 10개)</button>${field('questions','추가로 확인하고 싶은 질문',data.questions,'예: 어떤 자료를 더 준비하면 좋을까요?')}</section>`;
    $('add').onclick=()=>{sync();data.events.push({date:'',text:'',evidence:''});data.confirmed=false;render();};
  }
  if(step===2){$('editor').replaceChildren();$('confirm').checked=data.confirmed;$('draft').textContent=draft(data);}
  if(step>0)button('← 이전 내용 수정',()=>{if(step<2)sync();data.confirmed=false;step--;render();});
  if(step<2)button(step===0?'있었던 일 정리하기 →':'초안 확인하기 →',()=>{sync();if(step===1&&!data.events.some(e=>e.text.trim())){$('status').textContent='있었던 일을 하나 이상 적어주세요. 날짜와 자료는 비워 두어도 됩니다.';return;}data.confirmed=false;step++;render();window.scrollTo(0,0);},true);
  else{
    const save=button('초안 내려받기 (.txt)',()=>{
      if(!data.confirmed)return;
      const url=URL.createObjectURL(new Blob(['\uFEFF'+draft(data)],{type:'text/plain;charset=utf-8'}));
      const a=document.createElement('a');a.href=url;a.download='사건경위_증거목록_검토용초안.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      $('status').textContent='다운로드를 요청했습니다. 공유 기기라면 내려받은 파일도 직접 관리해 주세요.';
    },true);save.disabled=!data.confirmed;
    const print=button('인쇄 / PDF로 저장',()=>{if(data.confirmed)window.print();});print.disabled=!data.confirmed;
    $('confirm').onchange=()=>{data.confirmed=$('confirm').checked;$('draft').textContent=draft(data);save.disabled=print.disabled=!data.confirmed;};
  }
  button('입력 지우고 다시 시작',()=>{if(window.confirm('입력한 내용을 모두 지울까요? 내려받은 파일은 삭제되지 않습니다.')){data=blank();step=0;render();}});
}
document.querySelectorAll('.feedback').forEach(b=>b.onclick=()=>{$('feedback-status').textContent=`선택: ${b.textContent}. 서버로 전송하거나 저장하지 않았습니다. 입력한 내용은 위에서 수정할 수 있습니다.`;});
window.addEventListener('pagehide',()=>{data=blank();step=0;render();});
render();
