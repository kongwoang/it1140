import { Fault } from './store.mjs';

// A widget's client result is never sufficient: authenticate it with Siteverify.
export async function verifyBot(cfg,proof,ip,fetcher=fetch){
  if(cfg.dev&&!cfg.TURNSTILE_SECRET&&!cfg.TURNSTILE_SITE_KEY)return;
  if(!cfg.TURNSTILE_SECRET||!cfg.TURNSTILE_SITE_KEY)throw new Fault(503,'bot_not_configured');
  if(typeof proof!=='string'||!proof.length||proof.length>2048)throw new Fault(400,'bot_required');
  let response,value;
  try{
    response=await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify',{
      method:'POST',headers:{'Content-Type':'application/json'},redirect:'error',signal:AbortSignal.timeout(5000),
      body:JSON.stringify({secret:cfg.TURNSTILE_SECRET,response:proof,...(ip&&ip!=='unknown'?{remoteip:ip}:{})})
    });
    if(!response.ok)throw Error('siteverify_unavailable');
    value=await response.json();
  }catch{throw new Fault(503,'bot_unavailable');}
  if(value.success!==true||value.hostname!==new URL(cfg.origin).hostname||value.action!=='otp')throw new Fault(400,'bot_invalid');
}
