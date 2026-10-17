const encoder=new TextEncoder();

export async function verifyWebhook(request,bytes,secret,now=Date.now()){
  const timestamp=request.headers.get('X-SePay-Timestamp')||'';
  const signature=request.headers.get('X-SePay-Signature')||'';
  if(!secret||secret.length<32||!/^\d{10}$/.test(timestamp)||!/^sha256=[a-f0-9]{64}$/i.test(signature))return false;
  if(Math.abs(now/1000-Number(timestamp))>300)return false;
  const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
  const prefix=encoder.encode(`${timestamp}.`),message=new Uint8Array(prefix.length+bytes.length);
  message.set(prefix);message.set(bytes,prefix.length);
  const expected=Uint8Array.from(signature.slice(7).match(/../g),x=>Number.parseInt(x,16));
  return crypto.subtle.verify('HMAC',key,expected,message);
}

export function paymentCode(data){
  const codes=[...String(data.content||'').toUpperCase().matchAll(/\bIT1140[A-F0-9]{16}\b/g)].map(m=>m[0]);
  const explicit=typeof data.code==='string'?data.code.toUpperCase():'';
  if(/^IT1140[A-F0-9]{16}$/.test(explicit))codes.push(explicit);
  const unique=[...new Set(codes)];return unique.length===1?unique[0]:null;
}

export function bankTime(value){
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value))return null;
  const date=new Date(value.replace(' ','T')+'+07:00');
  if(!Number.isFinite(date.getTime()))return null;
  const local=new Date(date.getTime()+7*3600000).toISOString().slice(0,19).replace('T',' ');
  return local===value?date.toISOString():null;
}
