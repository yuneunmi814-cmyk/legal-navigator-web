import {formFields,seed,missing,documentText,documentHTML} from './payment-draft.mjs';
export function mountPaymentEditor(host,intake,reason,state=null,onChange=()=>{}){
 const el=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
 let d=state||seed(intake,reason),confirmed=false;onChange(d);const section=el('section');section.id='payment-document';
 section.append(el('h2','확인한 내용으로 작성본을 채웠습니다'),el('p','앞에서 확인한 항목은 다시 입력하지 않아도 됩니다. 비어 있거나 다른 내용만 수정하세요. 이 문서는 검토용 초안이며 법원 공식 양식을 대체한다고 보증하지 않습니다. 이름·주소는 기기 안에서만 처리합니다. 주민등록번호는 입력하지 마세요.'));
 const edit=el('div');edit.className='payment-controls';const known=el('details');known.append(el('summary','이미 채워진 항목 보기·수정'));edit.append(known);
 for(const [key,label] of [...formFields,['reason','직접 작성한 이의 이유 (선택)'],['partial','일부에 이의하는 경우 구체적인 범위']]){const l=el('label',label);const input=el('textarea');input.id='form-'+key;l.htmlFor=input.id;input.rows=2;input.maxLength=1500;input.value=d[key]||'';input.oninput=()=>{d[key]=input.value;invalidate();};(d[key]&&key!=='partial'?known:edit).append(l,input);}
 const label=el('label','이의 범위 — 자동으로 선택하지 않습니다');const select=el('select');select.id='form-scope';label.htmlFor=select.id;
 for(const [v,t] of [['','아직 확인하지 못함'],['all','지급명령 전부에 이의'],['partial','일부에 이의 — 위에 범위를 직접 적기']]){const o=el('option',t);o.value=v;select.append(o);}select.value=d.scope;select.onchange=()=>{d.scope=select.value;invalidate();};edit.append(label,select);section.append(edit);
 const issues=el('p');issues.id='payment-missing';const preview=el('pre');preview.id='payment-preview';section.append(issues,preview);
 const controls=el('div');controls.className='payment-controls';const checklabel=el('label');checklabel.className='check';const check=el('input');check.type='checkbox';check.id='payment-confirm';checklabel.append(check,document.createTextNode('채워진 작성본과 원문을 대조했습니다. 미확인 항목과 제출 전 확인 목록이 남을 수 있음을 이해합니다.'));controls.append(checklabel);
 const actions=el('div');actions.className='actions';const save=el('button','채워진 작성본 내려받기 (.html)');const print=el('button','이 작성본 인쇄 / PDF 저장');save.disabled=print.disabled=true;
 check.onchange=()=>{confirmed=check.checked;save.disabled=print.disabled=!confirmed;};
 save.onclick=()=>{if(!confirmed)return;const u=URL.createObjectURL(new Blob([documentHTML(d)],{type:'text/html;charset=utf-8'}));const a=el('a');a.href=u;a.download='지급명령_이의신청_검토용초안.html';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);};
 print.onclick=()=>{if(!confirmed)return;document.body.classList.add('payment-print');window.addEventListener('afterprint',()=>document.body.classList.remove('payment-print'),{once:true});try{window.print();}catch{document.body.classList.remove('payment-print');}};
 actions.append(save,print);controls.append(actions,el('p','HTML 파일은 브라우저로 열어 읽고 인쇄할 수 있습니다. 다운로드 파일에는 입력한 내용이 포함되므로 공유 기기에서는 직접 관리하세요.'));
 const official=el('a','기존 서식·공식 양식 안내와 대조하기');official.href='/forms/지급명령_이의신청서';official.target='_blank';official.rel='noopener';controls.append(official);section.append(controls);host.append(section);
 function invalidate(){confirmed=false;check.checked=false;save.disabled=print.disabled=true;onChange(d);update();}
 function update(){preview.textContent=documentText(d);issues.textContent=missing(d).length?'추가 확인: '+missing(d).join(' · '):'기본 기재칸이 채워졌습니다. 실제 송달일·기한·서명·제출처는 별도 확인하세요.';}
 update();return section;
}
