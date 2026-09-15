import {draft, issues} from './writing-model.mjs';

const node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
const fields=[['goal','어떤 도움을 받고 싶나요?'],['role','이 일에서 본인은 어떤 사람인가요?'],['text','어떤 일이 있었나요?'],['date','언제 있었나요?'],['evidence','확인할 자료가 있나요?'],['questions','추가로 확인하고 싶은 질문']];
export function mountJourney(host,{stage,data,go}){
  const value=(k,index=0)=>['text','date','evidence'].includes(k)?data.events[index][k]:data[k];
  const update=(k,v,index=0)=>{data.confirmed=false;if(['text','date','evidence'].includes(k))data.events[index][k]=v;else data[k]=v;};
  const button=(text,action,primary=false)=>{const b=node('button',text);b.type='button';b.onclick=action;if(primary)b.className='primary';return b;};
  const field=(parent,k,label,index=0)=>{const l=node('label',label),i=node(['text','questions'].includes(k)?'textarea':'input');i.id='story-'+k+(index?'-'+index:'');l.htmlFor=i.id;i.value=value(k,index);i.maxLength=4000;i.oninput=()=>update(k,i.value,index);parent.append(l,i);return i;};
  const heading=(text,description)=>{const h=node('h1',text);h.tabIndex=-1;host.append(h,node('p',description));host.lastChild.className='intro';};
  if(stage===4){
    heading('어떤 준비를 하고 싶나요?','기억나는 만큼만 적으세요. 법률 용어로 바꾸거나 정확한 날짜를 추측할 필요는 없습니다.');
    if(data.intake)host.append(node('p','앞에서 대조한 서류 내용은 함께 정리됩니다. 입력한 내용은 서버로 보내지 않습니다.'));
    field(host,'goal','어떤 도움을 받고 싶나요? (선택)');
    const text=field(host,'text','어떤 일이 있었나요?');text.placeholder='직접 본 일과 전해 들은 말을 구분해 주세요. 서류만 정리하려면 아래 버튼으로 계속할 수 있어요.';
    const optional=node('details');optional.append(node('summary','시점·역할·관련 자료도 적을게요 (선택)'));
    for(const [k,label] of fields.filter(([k])=>!['goal','text'].includes(k)))field(optional,k,label+' (모르면 비워두세요)');
    host.append(optional);
    data.events.slice(1).forEach((_,offset)=>{
      const index=offset+1,block=node('details');block.className='event-item';block.open=true;
      block.append(node('summary',`${index+1}번째 일`));
      field(block,'text','어떤 일이 있었나요?',index);
      field(block,'date','언제 있었나요? (모르면 비워두세요)',index);
      field(block,'evidence','확인할 자료가 있나요? (선택)',index);
      block.append(button('이 항목 지우기',()=>{
        if(Object.values(data.events[index]).some(v=>v.trim())&&!confirm('이 항목에 적은 내용을 지울까요?'))return;
        data.events.splice(index,1);data.confirmed=false;host.replaceChildren();mountJourney(host,{stage,data,go});
      }));host.append(block);
    });
    const add=button('있었던 일 추가 (최대 10개)',()=>{
      if(data.events.length>=10)return;data.events.push({date:'',text:'',evidence:''});data.confirmed=false;
      host.replaceChildren();mountJourney(host,{stage,data,go});document.getElementById('story-text-'+(data.events.length-1))?.focus();
    });add.disabled=data.events.length>=10;host.append(add);
    host.append(node('p','실명·주민등록번호·연락처 대신 ‘본인’, ‘상대방’처럼 적어도 됩니다. 새로고침하면 입력은 사라집니다.'));
    host.lastChild.className='hint';
    host.append(button('정리한 내용 확인하기',()=>{
      if(!data.events.some(item=>item.text.trim())&&!data.intake){document.getElementById('status').textContent='기억나는 일을 한 가지 적어 주세요. 날짜나 자료는 비워 두어도 됩니다.';text.focus();return;}go(5);
    },true));
  }
  if(stage===5){
    heading('내가 적은 내용, 맞나요?','빈칸은 미확인으로 남깁니다. 틀린 곳만 수정하고 계속하세요.');
    if(data.intake){const d=node('details');d.append(node('summary','앞에서 확인한 서류 보기'));for(const [k,v] of Object.entries(data.intake))d.append(node('p',`${({title:'제목',caseNumber:'사건번호',court:'기관',creditor:'채권자',debtor:'채무자',request:'요구 내용',deadlineText:'기한 안내'})[k]||k}: ${v||'미확인'}`));d.append(button('서류 내용 수정',()=>go(1)));host.append(d);}
    const edits=[];
    const reviewField=(k,label,index=0)=>{
      const row=node('details');row.className='review-item';
      const summary=node('summary');const name=node('span',label),shown=node('span',value(k,index)||'미확인');name.className='review-label';shown.className='review-value';summary.append(name,shown,node('small','수정'));row.append(summary);
      const input=field(row,k,label+' 수정',index);
      input.addEventListener('input',()=>shown.textContent=input.value||'미확인');
      edits.push(row);host.append(row);
    };
    for(const [k,label] of fields.filter(([k])=>['goal','role'].includes(k)))reviewField(k,label);
    data.events.forEach((_,index)=>{host.append(node('h2',`${index+1}번째 일`));for(const [k,label] of fields.filter(([k])=>['text','date','evidence'].includes(k)))reviewField(k,label,index);});
    reviewField('questions','추가로 확인하고 싶은 질문');
    host.append(button('있었던 일 더 적기',()=>go(4)));
    const label=node('label');label.className='check';const check=node('input');check.type='checkbox';check.id='story-check';label.append(check,document.createTextNode('적힌 내용을 확인했습니다. 모르는 항목은 미확인으로 남깁니다.'));
    const next=button('상담 준비자료 만들기',()=>{if(check.checked){data.confirmed=true;go(6);}},true);next.disabled=true;
    check.onchange=()=>next.disabled=!check.checked;
    for(const row of edits)row.addEventListener('input',()=>{check.checked=false;next.disabled=true;});
    host.append(label,next);
  }
  if(stage===6){
    heading('상담 준비자료가 준비됐어요.','내가 적은 사실과 확인할 항목을 모았습니다. 공식 제출 서류나 법적 판단은 아닙니다.');
    const panel=node('section');panel.className='panel';panel.append(node('h2','확인할 내용'));const list=node('ul');for(const issue of issues(data))list.append(node('li',issue));if(!list.children.length)list.append(node('li','빈칸은 없지만 내용의 정확성은 별도로 확인해야 합니다.'));panel.append(list,button('내용 수정하기',()=>go(5)));host.append(panel);
    const doc=node('details');doc.id='result-document';doc.append(node('summary','준비자료 펼쳐보기'));const pre=node('pre',draft(data));pre.id='draft-preview';doc.append(pre);host.append(doc);
    const actions=node('div');actions.className='actions';actions.append(button('준비자료 내려받기 (.txt)',()=>{if(!data.confirmed)return;const url=URL.createObjectURL(new Blob(['\uFEFF'+draft(data)],{type:'text/plain;charset=utf-8'}));const a=node('a');a.href=url;a.download='상담_준비자료.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},true),button('인쇄 / PDF 저장',()=>{if(!data.confirmed)return;const was=doc.open;doc.open=true;window.addEventListener('afterprint',()=>doc.open=was,{once:true});window.print();}));host.append(actions);
    host.append(node('p','내려받은 파일에는 입력 내용이 포함됩니다. 공유하거나 제출하기 전에 확인하세요. 다운로드는 접수가 아닙니다.'));host.lastChild.className='hint';
    const next=node('section');next.className='panel';next.append(node('h2','다음에 할 일'),node('p','확인할 자료를 챙기고, 상담을 받는 경우 이 준비자료를 함께 보여주세요. 서류의 기한은 원문과 담당 기관에 별도로 확인하세요.'));
    const forms=node('a','공식 서식과 기존 안내 찾기');forms.href='/#forms';const help=node('a','대한법률구조공단 상담 안내');help.href='https://www.klac.or.kr';help.target='_blank';help.rel='noopener';next.append(forms,node('br'),help);host.append(next);
  }
}
