export const KEY='legalnavi-confirmed-intake-v1';
export const fields=[['title','문서 제목','종이 맨 위의 제목'],['court','보낸 기관','법원·기관 이름. 상대방 이름과 구분하세요.'],['caseNumber','사건번호','연도·글자·숫자를 원문 그대로'],['role','문서에서 나를 부르는 말','예: 채무자. 알 수 없으면 비워 두세요.'],['request','상대방이나 기관이 요구하는 내용','청구취지·주문에서 확인한 문장을 옮기세요. 사실로 인정한다는 뜻이 아닙니다.'],['received','실제로 받은 날과 경위','작성일과 구분하세요. 모르면 비워 두세요.'],['deadlineText','서류에 적힌 기한 안내','문구를 그대로 옮기세요. 이 도구가 계산한 마감일이 아닙니다.']];
export function clean(value){return Object.fromEntries(fields.map(([k])=>[k,typeof value?.[k]==='string'?value[k].slice(0,1500):'']));}
export function pack(value,now=Date.now()){return JSON.stringify({version:1,created:now,value:clean(value)});}
export function unpack(raw,now=Date.now()){try{const p=JSON.parse(raw);if(p.version!==1||!Number.isFinite(p.created)||now<p.created||now-p.created>300000)return null;return clean(p.value);}catch{return null;}}
export function summary(value){return fields.map(([k,label])=>`${label}: ${value[k]?.trim()||'[미확인]'}`).join('\n');}
