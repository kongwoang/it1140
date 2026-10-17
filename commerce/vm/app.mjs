import { randomInt,randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Fault,hash,keyed,equal,token,uuid,transaction,rate,guard,recent,devices,issueSession,revokeDevice,claim } from './store.mjs';
import { courseRoute,bank,python } from './course.mjs';
import { verifyWebhook,paymentCode,bankTime } from '../payments.mjs';
import { verifyBot } from './bot.mjs';

const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'};
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8'}});
function secure(response,origin){
  const h=new Headers(response.headers);
  for(const [key,value] of Object.entries({
    'Cache-Control':'private, no-store, max-age=0','Vary':'Cookie','X-Content-Type-Options':'nosniff',
    'Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','Strict-Transport-Security':'max-age=31536000',
    'Permissions-Policy':'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy':`default-src 'self'; script-src 'self' https://challenges.cloudflare.com; worker-src ${origin}/commerce-sw.js; frame-src 'self' https://challenges.cloudflare.com; connect-src 'self' https://challenges.cloudflare.com; img-src 'self' data: blob: https://vietqr.app; style-src 'self' 'unsafe-inline'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'`
  }))if(!h.has(key))h.set(key,value);
  return new Response(response.body,{status:response.status,headers:h});
}
function cookies(request){
  const result=Object.create(null);for(const pair of (request.headers.get('cookie')||'').split(';')){const i=pair.indexOf('=');if(i>0)result[pair.slice(0,i).trim()]=pair.slice(i+1).trim();}return result;
}
async function bytes(request,max=16384){
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))throw new Fault(415,'json_required');
  const chunks=[];let size=0;const reader=request.body?.getReader();
  if(reader)while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw new Fault(413,'body_too_large');}chunks.push(value);}
  return Buffer.concat(chunks);
}
function parse(raw){try{const value=JSON.parse(raw.toString('utf8'));if(value&&typeof value==='object'&&!Array.isArray(value))return value;}catch{}throw new Fault(400,'invalid_json');}
export function emailAddress(value,domains){
  if(typeof value!=='string'||value.length>254)return null;
  const email=value.trim().toLowerCase();const match=email.match(/^([a-z0-9.!#$%&'*+/=?^_`{|}~-]+)@([a-z0-9.-]+)$/);
  return match&&(!domains||domains.includes(match[2]))?email:null;
}
function orderView(o,cfg){
  const qr=new URL('https://vietqr.app/img');
  for(const [k,v] of Object.entries({bank:'MB',acc:o.account_number,amount:o.amount,des:o.transfer_code,holder:cfg.BANK_ACCOUNT_NAME,template:'compact',showinfo:'true'}))qr.searchParams.set(k,String(v));
  return {id:o.id,amount:o.amount,status:o.status,code:o.transfer_code,expiresAt:o.expires_at,account:o.account_number,accountName:cfg.BANK_ACCOUNT_NAME,bank:'MB',qrUrl:qr.href};
}
export function createApp({pool,cfg,sendMail,botVerifier=verifyBot,publicRoot=resolve(import.meta.dirname,'../../.vm-dist/public'),logger=console}){
  const prefix=cfg.dev?'it1140-dev-':'__Host-it1140-';
  const names={session:prefix+'session',browser:prefix+'browser',enroll:prefix+'enroll'};
  const cookie=(name,value,age)=>`${name}=${value}; Path=/; HttpOnly; ${cfg.dev?'':'Secure; '}SameSite=Lax; Max-Age=${age}`;
  function signedIn(result){const response=json({success:true});response.headers.append('Set-Cookie',cookie(names.session,result.sessionToken,7*86400));response.headers.append('Set-Cookie',cookie(names.enroll,'',0));return response;}
  async function handle(request,ip){
    const url=new URL(request.url),path=url.pathname,method=request.method;
    if(url.origin!==cfg.origin)throw new Fault(421,'wrong_origin');
    if(path==='/healthz'&&method==='GET'){await pool.query('select 1');return json({ok:true});}
    if(path==='/api/config'&&method==='GET'){
      const p=(await pool.query("select amount,active from app.products where id='it1140-lifetime'")).rows[0];
      return json({ready:cfg.smtpReady&&(cfg.dev||cfg.botReady),turnstileSiteKey:cfg.TURNSTILE_SITE_KEY||'',paymentsEnabled:cfg.live&&p?.active===true,price:p?.amount??20000,
        domains:cfg.domains,supportEmail:cfg.SUPPORT_EMAIL||'',questions:bank.questions.length,exercises:python.exercises.length});
    }
    if(path.startsWith('/api/')){
      if(method!=='GET'&&path!=='/api/webhooks/sepay'&&request.headers.get('origin')!==cfg.origin)throw new Fault(403,'wrong_origin');
      const jar=cookies(request),sessionToken=jar[names.session],browserToken=/^[A-Za-z0-9_-]{43}$/.test(jar[names.browser]||'')?jar[names.browser]:token();
      if(path==='/api/auth/request'&&method==='POST'){
        if(!cfg.smtpReady)throw new Fault(503,'mail_not_configured');
        const data=parse(await bytes(request));const email=emailAddress(data.email,null);if(!email)throw new Fault(400,'hust_email_required');
        if(!emailAddress(email,cfg.domains)){
          const exception=await pool.query('select 1 from app.users where email=$1 and email_exception=true and disabled_at is null',[email]);
          if(!exception.rows.length)throw new Fault(400,'hust_email_required');
        }
        await rate(pool,'otp-ip:'+keyed(cfg.OTP_SECRET,ip),3000,900);
        await botVerifier(cfg,data.botToken,ip);
        // Reject cooldown/email limits BEFORE reserving shared mail capacity.
        const result=await transaction(pool,async db=>{
          await db.query('select pg_advisory_xact_lock(hashtextextended($1,1))',[email]);
          await rate(db,'otp-email:'+hash(email),3,900);
          const previous=(await db.query("select 1 from app.otp where email=$1 and created_at>now()-interval '60 seconds'",[email])).rows;
          if(previous.length)throw new Fault(429,'otp_cooldown');
          await rate(db,'otp-global',Number(cfg.OTP_MAX_PER_HOUR||1500),3600);
          // A stranger asking for a code must not invalidate another browser's OTP.
          await db.query('update app.otp set consumed_at=now() where email=$1 and browser_hash=$2 and consumed_at is null and verified_at is null',[email,hash(browserToken)]);
          const id=randomUUID(),code=String(randomInt(1000000)).padStart(6,'0');
          await db.query("insert into app.otp(id,email,code_hash,browser_hash,expires_at) values($1,$2,$3,$4,now()+interval '10 minutes')",[id,email,keyed(cfg.OTP_SECRET,id+':'+code),hash(browserToken)]);
          return {id,code};
        });
        try{await sendMail({to:email,subject:'Mã đăng nhập IT1140',text:`Mã đăng nhập IT1140: ${result.code}\nMã có hiệu lực trong 10 phút, dùng một lần. Không chia sẻ mã với người khác.\nNếu bạn không yêu cầu, hãy bỏ qua email này.`});}
        catch{await pool.query('update app.otp set consumed_at=now() where id=$1',[result.id]);throw new Fault(503,'mail_unavailable');}
        const response=json({challengeId:result.id,retryAfter:60});response.headers.append('Set-Cookie',cookie(names.browser,browserToken,400*86400));return response;
      }
      if(path==='/api/auth/verify'&&method==='POST'){
        const data=parse(await bytes(request));if(!uuid(data.challengeId)||typeof data.code!=='string'||!/^\d{6}$/.test(data.code))throw new Fault(400,'invalid_otp');
        await rate(pool,'verify-ip:'+keyed(cfg.OTP_SECRET,ip),6000,900);
        const result=await transaction(pool,async db=>{
          const o=(await db.query('select * from app.otp where id=$1 for update',[data.challengeId])).rows[0];
          if(!o||o.consumed_at||o.verified_at||new Date(o.expires_at)<=new Date()||o.attempts>=5||o.browser_hash!==hash(browserToken))return {failure:true};
          await db.query('update app.otp set attempts=attempts+1 where id=$1',[o.id]);
          if(!equal(o.code_hash,keyed(cfg.OTP_SECRET,o.id+':'+data.code)))return {failure:true};
          const issued=await issueSession(db,{email:o.email,browserToken,label:String(data.label||'Trình duyệt').slice(0,80)});
          if(issued.limited){const enrollment=token();await db.query("update app.otp set verified_at=now(),enroll_hash=$2,enroll_expires_at=now()+interval '5 minutes' where id=$1",[o.id,hash(enrollment)]);return {...issued,enrollment};}
          await db.query('update app.otp set verified_at=now(),consumed_at=now() where id=$1',[o.id]);return issued;
        });
        if(result.failure)throw new Fault(400,'invalid_otp');
        if(result.limited){const response=json({error:'device_limit',devices:result.devices},409);response.headers.append('Set-Cookie',cookie(names.enroll,result.enrollment,300));return response;}
        return signedIn(result);
      }
      if(path==='/api/auth/enroll'&&method==='POST'){
        const data=parse(await bytes(request));if(!uuid(data.replaceId)||!/^[A-Za-z0-9_-]{43}$/.test(jar[names.enroll]||''))throw new Fault(400,'invalid_enrollment');
        await rate(pool,'enroll-ip:'+keyed(cfg.OTP_SECRET,ip),600,900);
        const issued=await transaction(pool,async db=>{
          const o=(await db.query('select * from app.otp where enroll_hash=$1 and consumed_at is null and enroll_expires_at>now() for update',[hash(jar[names.enroll])])).rows[0];
          if(!o||o.browser_hash!==hash(browserToken))throw new Fault(403,'invalid_enrollment');
          const result=await issueSession(db,{email:o.email,browserToken,label:String(data.label||'Trình duyệt'),replaceId:data.replaceId});
          await db.query('update app.otp set consumed_at=now() where id=$1',[o.id]);return result;
        });return signedIn(issued);
      }
      if(path==='/api/webhooks/sepay'&&method==='POST'){
        if(!cfg.SEPAY_WEBHOOK_SECRET||!cfg.BANK_ACCOUNT)throw new Fault(503,'not_configured');
        const raw=await bytes(request,65536);
        if(!await verifyWebhook(request,raw,cfg.SEPAY_WEBHOOK_SECRET))throw new Fault(401,'invalid_signature');
        const p=parse(raw);if(!Number.isSafeInteger(p.id)||p.id<=0||!Number.isSafeInteger(p.transferAmount)||p.transferAmount<=0)throw new Fault(400,'invalid_transaction');
        if(p.transferType!=='in')return json({success:true});
        const receiver=String(p.accountNumber||''),gateway=String(p.gateway||'').toLowerCase().replace(/\s/g,'');
        const r=await pool.query('select app.receive_payment($1,$2,$3,$4,$5,$6,$7) result',[String(p.id),hash(raw),paymentCode(p),p.transferAmount,receiver,bankTime(p.transactionDate),['mb','mbbank'].includes(gateway)&&receiver===cfg.BANK_ACCOUNT]);
        if(r.rows[0].result.outcome==='review')logger.warn('payment_review',{transactionId:String(p.id),reason:r.rows[0].result.reason});
        return json({success:true});
      }
      const courseRequest=path.startsWith('/api/course/');
      // One authoritative authorization read per request, not one per caller.
      // In-flight responses cannot recall bytes already sent; every new request
      // rechecks the DB and no application-side entitlement/lease cache is used.
      const a=await guard(pool,sessionToken,{browserToken:jar[names.browser],paid:courseRequest||path==='/api/study/claim'||path==='/api/study/heartbeat',study:courseRequest||path==='/api/study/heartbeat'});
      await rate(pool,'api:'+a.user_id,300,60);
      if(path==='/api/me'&&method==='GET')return json({id:a.user_id,email:a.email,lifetime:a.owned,deviceId:a.device_id});
      if(path==='/api/auth/logout'&&method==='POST'){
        await transaction(pool,async db=>{await db.query('update app.sessions set revoked_at=now() where id=$1',[a.session_id]);await db.query('delete from app.leases where session_id=$1',[a.session_id]);});
        const r=json({success:true});r.headers.append('Set-Cookie',cookie(names.session,'',0));return r;
      }
      if(path==='/api/devices'&&method==='GET')return json({devices:await devices(pool,a.user_id),current:a.device_id});
      if(path==='/api/devices/revoke'&&method==='POST'){
        recent(a);const data=parse(await bytes(request));if(!uuid(data.id))throw new Fault(400,'invalid_device');
        await transaction(pool,async db=>{await db.query('select id from app.users where id=$1 for update',[a.user_id]);
          const n=(await db.query("select count(*)::int n from app.device_changes where user_id=$1 and created_at>now()-interval '30 days'",[a.user_id])).rows[0].n;
          if(n>=2)throw new Fault(429,'replacement_limit');await revokeDevice(db,a.user_id,data.id,'self_revoke');});return json({success:true});
      }
      if(path==='/api/study/claim'&&method==='POST'){
        const data=parse(await bytes(request));
        if(data.takeover===true)await rate(pool,'takeover:'+a.user_id,5,3600);
        return json(await claim(pool,a,data.takeover===true));
      }
      if(path==='/api/study/heartbeat'&&method==='POST'){
        return json(await claim(pool,a));
      }
      if(path==='/api/study/release'&&method==='POST'){await pool.query('delete from app.leases where user_id=$1 and session_id=$2',[a.user_id,a.session_id]);return json({success:true});}
      if(path==='/api/orders'&&method==='POST'){
        if(!cfg.live)throw new Fault(503,'sales_disabled');if(a.owned)throw new Fault(409,'already_owned');
        await rate(pool,'orders:'+a.user_id,5,3600);
        const code='IT1140'+randomUUID().replace(/-/g,'').slice(0,16).toUpperCase();
        const o=(await pool.query('select * from app.create_order($1,$2,$3)',[a.user_id,code,cfg.BANK_ACCOUNT])).rows[0];return json(orderView(o,cfg),201);
      }
      if(path.startsWith('/api/orders/')&&method==='GET'){
        const id=path.slice('/api/orders/'.length);if(!uuid(id))throw new Fault(404,'not_found');
        const o=(await pool.query("select o.*,exists(select 1 from app.payments p where p.order_id=o.id and p.outcome='review') needs_review from app.orders o where o.id=$1 and o.user_id=$2",[id,a.user_id])).rows[0];
        if(!o)throw new Fault(404,'not_found');return json({...orderView(o,cfg),needsReview:o.needs_review});
      }
      if(courseRequest){
        const data=method==='POST'?parse(await bytes(request)):{};
        const result=await transaction(pool,async db=>{
          if(path==='/api/course/exams'&&method==='POST')await rate(db,'exam:'+a.user_id,10,3600);
          if(path==='/api/course/grade'&&method==='POST')await rate(db,'grade:'+a.user_id,90,60);
          return courseRoute(path,method,url,data,db,a);
        });return json(result);
      }
      throw new Fault(404,'not_found');
    }
    if(!['GET','HEAD'].includes(method))throw new Fault(405,'method_not_allowed');
    let file=path==='/'?'index.html':path.slice(1);
    if(path==='/learn'||path==='/learn.html'){
      const jar=cookies(request);
      try{await guard(pool,jar[names.session],{browserToken:jar[names.browser],paid:true});}catch(e){if(e instanceof Fault)return Response.redirect(cfg.origin+'/',303);throw e;}file='learn.html';
    }
    const allowed=['index.html','account.js','account.css','commerce-sw.js','commerce-access.js','study-client.js','legal.html','python-sandbox.html','python-sandbox.js','python-sandbox-frame.js'];
    if(file!=='learn.html'&&!allowed.includes(file)&&!/^assets\/(css|js)\/[a-z0-9-]+\.(css|js)$/.test(file))throw new Fault(404,'not_found');
    // Never expose the original client-side grading code through a spare URL.
    if(file==='assets/js/quiz-app.js'||file==='assets/js/python-worker.js')throw new Fault(404,'not_found');
    let content;try{content=await readFile(resolve(publicRoot,file));}catch(e){if(e.code==='ENOENT')throw new Fault(404,'not_found');throw e;}
    const headers={'Content-Type':mime[file.slice(file.lastIndexOf('.'))]||'application/octet-stream'};
    if(file==='python-sandbox.html'||file==='python-sandbox-frame.js'){
      headers['Content-Security-Policy']="sandbox allow-scripts; default-src 'none'; script-src 'self' blob: https://cdn.jsdelivr.net/pyodide/v314.0.6/full/ 'wasm-unsafe-eval'; worker-src blob:; connect-src https://cdn.jsdelivr.net/pyodide/v314.0.6/full/; img-src data: blob:; style-src 'unsafe-inline'; frame-ancestors 'self'; base-uri 'none'; form-action 'none'";
      headers['X-Frame-Options']='SAMEORIGIN';
    }
    // Only allowlisted non-personalized CSS/JS can be shared by browsers/CDNs.
    // HTML, API and service-worker migration stay private/no-store.
    if(/\.(?:css|js)$/.test(file)&&file!=='commerce-sw.js')headers['Cache-Control']='public, max-age=300';
    return new Response(method==='HEAD'?null:content,{headers});
  }
  return {names,async fetch(request,ip='unknown'){
    try{return secure(await handle(request,ip),cfg.origin);}catch(error){
      if(!(error instanceof Fault))logger.error('request_failed',{code:error.code||'internal'});
      const response=json({error:error instanceof Fault?error.message:'service_unavailable',...(error instanceof Fault?error.details:{})},error instanceof Fault?error.status:503);
      if(error.status===429)response.headers.set('Retry-After','60');return secure(response,cfg.origin);
    }
  }};
}
