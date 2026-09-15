export const blank = () => ({goal:'',role:'',document:'',events:[{date:'',text:'',evidence:''}],questions:'',confirmed:false,intake:null,paymentChoice:'',objection:''});
export function issues(data){
  const result=[];
  if(!data.goal.trim())result.push('원하는 도움을 아직 적지 않았습니다.');
  if(!data.role.trim())result.push('사건에서 본인의 역할을 아직 적지 않았습니다.');
  data.events.forEach((event,i)=>{
    if(!event.text.trim())result.push(`${i+1}번째 일의 내용이 비어 있습니다.`);
    if(!event.date.trim())result.push(`${i+1}번째 일의 날짜는 미확인입니다.`);
    if(!event.evidence.trim())result.push(`${i+1}번째 일의 관련 자료는 미확인입니다. 자료가 없다는 뜻은 아닙니다.`);
    if(/^\d{4}-\d{2}-\d{2}$/.test(event.date)){
      const parsed=new Date(event.date+'T00:00:00Z');
      if(!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0,10)!==event.date)result.push(`${i+1}번 날짜가 달력에 맞지 않습니다. 원문을 확인하세요.`);
      const previous=data.events[i-1]?.date;
      if(previous && /^\d{4}-\d{2}-\d{2}$/.test(previous) && previous>event.date)result.push(`${i+1}번 날짜가 앞 항목보다 이릅니다. 입력 순서를 그대로 두었으니 순서를 확인하세요.`);
    }
  });
  return result;
}
export function draft(data){
  const value=s=>s.trim()||'[미확인]';
  return ['사건 경위 및 증거 정리 — 상담·작성 준비용 초안',
    '공식 제출 서식이 아닙니다. 입력한 사실을 정리했으며 법적 주장·기한·승패를 판단하지 않았습니다.',
    `사용자 대조: ${data.confirmed?'입력 내용과 초안을 대조함 (법률 검수 아님)':'아직 대조하지 않음'}`,
    ...(data.intake?['\n받은 서류에서 사용자가 대조한 항목 (사실·법률 검증 아님)',...Object.entries(data.intake).map(([k,v])=>`${({title:'문서 제목',court:'보낸 기관',creditor:'채권자',debtor:'채무자',caseNumber:'사건번호',role:'문서에서 내 역할',request:'문서의 요구 내용',received:'받은 날·경위',deadlineText:'기한 안내 원문'})[k]||k}: ${value(v)}`)]:[]),
    ...(data.paymentChoice==='object'?['\n지급명령 이의신청 작성 준비 (사용자 선택)',`사용자가 적은 이의 이유: ${value(data.objection)}`,'이의 범위·송달일·관할·현재 사건 상태를 확인한 뒤 공식 서식에 옮기세요. 이 준비문 자체를 제출하지 마세요.']:[]),
    '\n1. 원하는 도움',value(data.goal),'\n2. 내 역할',value(data.role),
    '\n3. 받은 문서',value(data.document),'\n4. 사건 경위 (입력 순서)',
    ...data.events.map((e,i)=>`${i+1}. 시점: ${value(e.date)}\n내용: ${value(e.text)}\n관련 자료: ${value(e.evidence)}`),
    '\n5. 증거·자료 목록',...data.events.map((e,i)=>`${i+1}번째 일 관련: ${value(e.evidence)}`),
    '\n6. 상담하거나 추가 확인할 질문',value(data.questions),
    '\n7. 미확인 항목',...(issues(data).length?issues(data):['원하는 도움·역할·사건 항목에 빈칸은 없습니다. 위의 [미확인] 표시와 내용의 정확성은 직접 확인하세요. 진실성·법률적 적합성이 검증된 것은 아닙니다.']),
    '\n작성 유의: 상대방의 의도나 범죄 여부를 자동으로 추정하지 않았습니다. 원본 자료는 별도로 보관하고 제출처·양식·기한은 별도로 확인하세요.'
  ].join('\n');
}
