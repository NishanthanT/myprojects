export function mechanicalId(value){
  if(!/^\d+$/.test(String(value))||!Number.isSafeInteger(Number(value))||Number(value)<1)throw Object.assign(new Error('Invalid record ID.'),{status:400});
  return Number(value);
}
function required(value,label,max){
  if(typeof value!=='string'||!value.trim()||value.trim().length>max)throw Object.assign(new Error(`${label} is required and must be at most ${max} characters.`),{status:400});
  return value.trim();
}
export const mechanicalTypeInput=body=>({type_name:required(body?.type_name,'Mechanical type',100)});
export function mechanicInput(body){
  const phone=required(body?.phone,'Phone number',30);
  if(!/^[+\d\s().-]+$/.test(phone)||phone.replace(/\D/g,'').length<7)throw Object.assign(new Error('Enter a valid phone number.'),{status:400});
  return {mechanic_name:required(body?.mechanic_name,'Mechanic name',100),address:required(body?.address,'Address',255),phone,type_id:mechanicalId(body?.type_id)};
}
