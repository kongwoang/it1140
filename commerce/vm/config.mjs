import { readFileSync } from 'node:fs';

export function stagingOrigin(value){
  try{const u=new URL(value);return u.origin===value&&['https:','http:'].includes(u.protocol)
    &&(['localhost','127.0.0.1','[::1]'].includes(u.hostname)||/^staging[.-][a-z0-9.-]+$/.test(u.hostname));}catch{return false;}
}

export function configuration(input=process.env) {
  const env={...input};
  for(const key of ['DATABASE_URL','OTP_SECRET','SEPAY_WEBHOOK_SECRET','SMTP_PASSWORD']) {
    if(env[key+'_FILE']) env[key]=readFileSync(env[key+'_FILE'],'utf8').trim();
  }
  const dev=env.NODE_ENV==='development';
  const origin=env.APP_ORIGIN || (dev?'http://localhost:4180':'');
  let url;try{url=new URL(origin);}catch{throw Error('APP_ORIGIN is required');}
  if(url.origin!==origin || (!dev && url.protocol!=='https:'))throw Error('APP_ORIGIN must be an exact HTTPS origin');
  if(dev&&!['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw Error('Development mode is localhost-only');
  if(!env.DATABASE_URL)throw Error('DATABASE_URL is required');
  if(!env.OTP_SECRET || env.OTP_SECRET.length<48)throw Error('OTP_SECRET must contain at least 48 random characters');
  const domains=(env.EMAIL_DOMAINS || 'sis.hust.edu.vn,hust.edu.vn').split(',').map(s=>s.trim().toLowerCase());
  if(!domains.every(d=>/^[a-z0-9]+(?:[.-][a-z0-9]+)*\.[a-z]{2,}$/.test(d)))throw Error('Invalid EMAIL_DOMAINS');
  const live=env.PAYMENTS_ENABLED==='true';
  if(live && (!/^[0-9]{6,19}$/.test(env.BANK_ACCOUNT||'') || !env.BANK_ACCOUNT_NAME?.trim()
    || env.SEPAY_WEBHOOK_SECRET?.length<32 || !env.SEPAY_WEBHOOK_SECRET
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.SUPPORT_EMAIL||'') || env.SELLER_READY!=='true'))throw Error('Live payments require bank, HMAC secret, support and SELLER_READY');
  const smtpReady=Boolean(env.SMTP_HOST&&env.SMTP_FROM&&env.SMTP_USER&&env.SMTP_PASSWORD);
  if(!dev&&!smtpReady)throw Error('Production requires authenticated SMTP');
  const poolSize=Number(env.DB_POOL_SIZE||10),otpMax=Number(env.OTP_MAX_PER_HOUR||1500),port=Number(env.PORT||4180);
  if(!Number.isInteger(poolSize)||poolSize<1||poolSize>30||!Number.isInteger(otpMax)||otpMax<1||otpMax>10000||!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid resource limits');
  return {...env,origin,dev,domains,live,smtpReady,port,poolSize};
}
