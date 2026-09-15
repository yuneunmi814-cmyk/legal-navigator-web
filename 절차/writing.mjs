import {blank,draft} from './writing-model.mjs';
import {KEY,unpack,fields} from './intake-model.mjs';
let data=blank(),step=0;
try{const raw=sessionStorage.getItem(KEY);sessionStorage.removeItem(KEY);const intake=unpack(raw);if(intake){data.intake=intake;data.document=intake.title;data.role=intake.role;}}catch{}
const $=id=>document.getElementById(id);
const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function field(id,label,value,placeholder='',single=false){const attrs=`id="${id}" maxlength="4000" placeholder="${placeholder}"`;return `<label for="${id}">${label}</label>`+(single?`<input ${attrs} value="${escape(value)}">`:`<textarea ${attrs}>${escape(value)}</textarea>`);}
function sync(){
  if(step===0){for(const key of ['goal','role','document'])data[key]=$(key).value;if(data.intake){for(const [key] of fields)data.intake[key]=$('received-'+key).value;data.document=data.intake.title;}if(data.document.replace(/\s/g,'')!=='지급명령'){data.paymentChoice='';data.objection='';}}
  if(step===1){data.events.forEach((e,i)=>{for(const key of ['date','text','evidence'])e[key]=$(`${key}-${i}`).value;});data.questions=$('questions').value;if($('payment-choice')){data.paymentChoice=$('payment-choice').value;data.objection=$('objection').value;}}
}
function button(text,handler,primary=false){const b=document.createElement('button');b.textContent=text;if(primary)b.className='primary';b.onclick=handler;$('actions').append(b);return b;}
function renderFormGuide(){
 $('form-guide')?.remove();if(data.paymentChoice!=='object')return;
 const section=document.createElement('section');section.id='form-guide';
 const title=document.createElement('h2');title.textContent='이 내용을 서식의 어느 칸에 옮기나요?';section.append(title);
 const note=document.createElement('p');note.textContent='사용자가 이의신청 준비를 선택해 표시합니다. 법적 적합성 확인이나 자동 제출이 아닙니다. 모르는 칸은 추정하지 마세요.';section.append(note);
 const rows=[['사건',data.intake?.caseNumber,'받은 지급명령의 사건번호와 한 글자씩 대조'],['지급명령 발령 법원',data.intake?.court,'문서에 적힌 발령 법원을 확인'],['송달받은 날짜',data.intake?.received,'서식의 연·월·일 칸에 옮기기 전 실제 송달일 확인. 작성일은 사용하지 않음'],['이의 이유',data.objection,'직접 확인한 내용만 옮기기. 전부·일부 이의 범위는 별도 확인'],['채권자·채무자·주소·연락처','','실제 제출 서식에서 원문과 대조해 직접 기재. 별칭을 제출하지 않기'],['작성일·서명 또는 날인','','실제 작성일과 본인 서명 확인']];
 for(const [label,value,hint] of rows){const row=document.createElement('div');row.className='event';const h=document.createElement('h3');h.textContent=label;const p=document.createElement('p');p.style.overflowWrap='anywhere';p.textContent=value||'미확인 — 직접 확인이 필요합니다.';const small=document.createElement('p');small.textContent=hint;row.append(h,p,small);if(value){const b=document.createElement('button');b.textContent=label+' 내용 복사';b.onclick=async()=>{try{await navigator.clipboard.writeText(value);b.textContent='복사했습니다';}catch{b.textContent='자동 복사 불가 — 위 내용을 선택해 복사하세요';}};row.append(b);}section.append(row);}
 const link=document.createElement('a');link.href='/forms/지급명령_이의신청서';link.target='_blank';link.rel='noopener';link.textContent='작성 내용 유지하고 지급명령 이의신청서 열기 →';section.append(link);
 const checklist=document.createElement('p');checklist.textContent='제출 전: 서식이 현재 내 상황에 맞는지 · 이의 범위 · 실제 송달일과 제출기한 · 발령 법원 · 사건번호·당사자 · 서명 · 접수 확인 방법을 점검하세요. 원본과 봉투·전자송달 내역은 별도로 보관하세요.';section.append(checklist);$('review').after(section);
}
function render(){
  $('status').textContent='';$('actions').replaceChildren();$('review').hidden=step!==2;$('editor').hidden=step===2;
  $('progress').textContent=['1 / 3 · 원하는 도움','2 / 3 · 있었던 일과 자료','3 / 3 · 대조하고 내려받기'][step];
  if(step===0)$('editor').innerHTML=`<section><h2>어떤 도움을 원하시나요?</h2>${field('goal','원하는 해결이나 도움',data.goal,'예: 돈을 돌려받을 방법을 상담하고 싶어요')}${field('role','이 일에서 나는 어떤 사람인가요?',data.role,'예: 돈을 보낸 사람, 세입자, 통지를 받은 사람')}${field('document','받은 문서가 있나요? (선택)',data.document,'문서 제목만 적어도 됩니다. 없거나 모르면 비워 두세요')}</section>`;
  if(step===0&&data.intake){$('document').hidden=true;document.querySelector('label[for="document"]').hidden=true;const section=document.createElement('section');section.innerHTML='<h2>앞에서 확인한 내용이 이어졌습니다</h2><p>한 번 읽은 임시 저장 내용은 삭제했습니다. 잘못 확인한 항목은 여기서 수정하세요. 빈칸은 미확인입니다.</p>'+fields.map(([k,label,hint])=>field('received-'+k,label,data.intake[k],hint)).join('');$('editor').append(section);}
  if(step===1){
    $('editor').innerHTML=`<section><h2>있었던 일을 하나씩 적어주세요</h2><p>직접 본 사실, 전해 들은 말, 자신의 생각을 구분해 주세요. 정확한 날짜가 기억나지 않으면 ‘8월쯤’처럼 적어도 됩니다. 자동으로 날짜를 추정하지 않습니다.</p>${data.events.map((e,i)=>`<div class="event"><h3>${i+1}번째 일</h3>${field(`date-${i}`,'언제 있었나요?',e.date,'예: 2026-08-10 / 8월쯤 / 기억나지 않음',true)}${field(`text-${i}`,'어떤 일이 있었나요?',e.text,'상대방의 의도를 단정하기보다 있었던 일을 적어주세요')}${field(`evidence-${i}`,'확인에 도움이 될 자료가 있나요?',e.evidence,'예: 이체 내역, 주고받은 문자. 파일을 올릴 필요는 없습니다.')}</div>`).join('')}<button id="add" ${data.events.length>=10?'disabled':''}>있었던 일 추가 (최대 10개)</button>${field('questions','추가로 확인하고 싶은 질문',data.questions,'예: 어떤 자료를 더 준비하면 좋을까요?')}</section>`;
    $('add').onclick=()=>{sync();data.events.push({date:'',text:'',evidence:''});data.confirmed=false;render();};
    if(data.document.replace(/\s/g,'')==='지급명령'){
      const section=document.createElement('section');section.innerHTML=`<h2>지급명령을 받았다면</h2><p>상대방의 신청을 바탕으로 법원이 내린 지급명령입니다. 읽은 청구 내용이 모두 사실로 검증됐다는 뜻은 아닙니다. 제목·내 역할·현재 상태부터 확인하세요.</p><p>일반적으로 송달받은 날부터 2주 이내에 이의신청을 할 수 있습니다. 이 화면은 실제 송달일이나 마지막 날을 계산하지 않습니다. 기한이 임박했거나 지난 것 같으면 발령 법원에 즉시 확인하세요.</p><p><a href="https://www.law.go.kr/법령/민사소송법/제470조" target="_blank" rel="noopener">민사소송법 제470조</a> · <a href="https://www.scourt.go.kr/nm/min_1/min_1_7/min_1_7_1/index.html" target="_blank" rel="noopener">법원 독촉절차 안내</a> (확인: 2026-09-15)</p><label for="payment-choice">내가 원하는 다음 행동</label><select id="payment-choice"><option value="">아직 선택하지 않음</option><option value="understand">내용과 현재 상태부터 확인하고 싶어요</option><option value="object">내가 채무자로 기재된 지급명령에 이의신청을 준비하고 싶어요</option><option value="consult">내 역할·송달일·대응 방법을 상담하고 싶어요</option></select>${field('objection','이의신청을 선택했다면, 내가 직접 확인한 이의 이유 (선택)',data.objection,'예시를 그대로 쓰지 말고 본인의 사실만 적으세요. 모르면 비워 두세요.')}<p>채권자이거나 다른 종류의 서류라면 이 서식을 선택하지 마세요. 이의 범위가 일부이거나 이미 확정됐는지 모르겠다면 별도 확인이 필요합니다.</p>`;
      $('editor').prepend(section);$('payment-choice').value=data.paymentChoice;
    }
  }
  if(step===2){$('editor').replaceChildren();$('confirm').checked=data.confirmed;$('draft').textContent=draft(data);renderFormGuide();}
  else $('form-guide')?.remove();
  if(step>0)button('← 이전 내용 수정',()=>{if(step<2)sync();data.confirmed=false;step--;render();});
  if(step<2)button(step===0?'있었던 일 정리하기 →':'초안 확인하기 →',()=>{sync();if(step===1&&!data.events.some(e=>e.text.trim())&&data.paymentChoice!=='object'){$('status').textContent='있었던 일을 하나 이상 적어주세요. 날짜와 자료는 비워 두어도 됩니다.';return;}data.confirmed=false;step++;render();window.scrollTo(0,0);},true);
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
let feedback='';
document.querySelectorAll('.feedback').forEach(b=>b.onclick=()=>{feedback=`작성 도우미 개선 요청 (웹 2026-09-15): ${b.textContent}. 사건 내용은 포함하지 않았습니다.`;$('feedback-status').textContent=feedback;$('copy-feedback').hidden=false;});
$('copy-feedback').onclick=async()=>{try{await navigator.clipboard.writeText(feedback);$('feedback-status').textContent=feedback+' 복사했습니다. 아직 전송하지 않았습니다.';}catch{$('feedback-status').textContent=feedback+' 자동 복사가 안 됩니다. 이 문구를 직접 복사해 주세요.';}};
window.addEventListener('pagehide',()=>{data=blank();step=0;render();});
render();
