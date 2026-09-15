// Conservative, local extraction. Each suggestion retains an exact source span.
// No received-date inference from issuance dates, and no assumption about the user's role.
export function extract(source){
 const result={};
 const patterns={
  title:/^[ \t]*지[ \t]*급[ \t]*명[ \t]*령[ \t]*$/gm,
  caseNumber:/20\d{2}[ \t]*(?:차전|차)[ \t]*\d+/g,
  court:/[가-힣]+(?:지방법원|고등법원|가정법원)(?:[ \t]+[가-힣]+지원)?/g,
  creditor:/^[ \t]*채[ \t]*권[ \t]*자[ \t]*[:：]?[ \t]+([^\n\r]+)/gm,
  debtor:/^[ \t]*채[ \t]*무[ \t]*자[ \t]*[:：]?[ \t]+([^\n\r]+)/gm,
  request:/^[ \t]*채무자는[^\n\r]+(?:지급하라|지급할 것)[^\n\r]*/gm,
  deadlineText:/^[^\n\r]*(?:송달|고지)[^\n\r]*(?:2주|2 주|14일|14 일)[^\n\r]*$/gm
 };
 for(const [key,pattern] of Object.entries(patterns)){
  const found=[...source.matchAll(pattern)].map(m=>({value:(m[1]||m[0]).trim(),start:m.index,end:m.index+m[0].length,quote:m[0]}));
  const unique=[...new Set(found.map(m=>m.value.replace(/\s/g,'')))];
  if(unique.length===1){const first=found[0];result[key]={...first,value:['title','caseNumber'].includes(key)?first.value.replace(/\s/g,''):first.value};}
  else if(unique.length>1)result[key]={ambiguous:true};
 }
 // A bundle mentioning other document headings is not confidently one payment order.
 if(result.title&&/^[ \t]*(?:소장|판결문|약식명령|지급명령신청서)[ \t]*$/m.test(source))result.title={ambiguous:true};
 return result;
}
