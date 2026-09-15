import {fields,KEY,pack,summary} from './intake-model.mjs';
export function review(host,source=''){
 host.replaceChildren();
 const el=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
 host.append(el('h2','이 서류가 내게 요구하는 것은 무엇인가요?'),el('p','원문을 보며 아래 항목을 확인하세요. 비어 있는 항목은 미확인으로 남깁니다. 상대방의 주장과 확인된 사실은 다릅니다.'));
 const original=el('details');original.open=true;original.append(el('summary','읽은 원문 — 잘못 읽힌 글자는 원본 파일과 대조하세요'));
 const pre=el('pre',source||'읽은 원문이 없습니다. 가지고 있는 종이에서 직접 확인하세요.');pre.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;max-height:22rem;overflow:auto;font:inherit';original.append(pre);host.append(original);
 const inputs={};
 for(const [key,label,hint] of fields){const row=el('div');row.style.margin='18px 0';const l=el('label',label);l.htmlFor='intake-'+key;const input=el('textarea');input.id=l.htmlFor;input.maxLength=1500;input.rows=2;input.style.cssText='display:block;width:100%;box-sizing:border-box;font:inherit';input.placeholder=hint;inputs[key]=input;row.append(l,input,el('small',hint));host.append(row);}
 host.append(el('p','다음 화면에서 원하는 도움을 선택하고, 이 내용을 다시 수정할 수 있습니다. 사건 결과·제출 가능 여부·마감일은 자동 판단하지 않습니다.'));
 const label=el('label');const consent=el('input');consent.type='checkbox';consent.id='intake-consent';label.append(consent,document.createTextNode(' 적은 내용을 원문과 대조했고, 이 항목만 작성 화면으로 옮기는 데 동의합니다. 같은 탭의 임시 저장소를 사용하며 읽은 즉시 삭제합니다. 5분이 지나면 이어 쓰지 않습니다. 사진·원문은 저장하지 않습니다.'));host.append(label);
 const b=el('button','확인한 내용으로 작성 이어가기');b.className='go';b.disabled=true;consent.onchange=()=>b.disabled=!consent.checked;
 for(const input of Object.values(inputs))input.oninput=()=>{consent.checked=false;b.disabled=true;};
 const status=el('p');status.setAttribute('role','status');
 b.onclick=()=>{if(!consent.checked)return;const value=Object.fromEntries(fields.map(([k])=>[k,inputs[k].value]));try{sessionStorage.setItem(KEY,pack(value));location.assign(new URL('작성.html',location.href));}catch{status.textContent='임시 저장소를 사용할 수 없습니다. 아래 준비문을 복사한 뒤 작성 화면에 옮겨 주세요.';const fallback=el('textarea');fallback.readOnly=true;fallback.value=summary(value);fallback.rows=12;fallback.style.width='100%';const link=el('a','작성 화면을 새 탭에서 열기');link.href='작성.html';link.target='_blank';link.rel='noopener';host.append(fallback,link);}};
 host.append(b,status);const back=el('button','서류 확인 처음으로');back.onclick=()=>location.reload();host.append(back);
}
