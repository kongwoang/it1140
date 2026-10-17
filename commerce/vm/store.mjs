import { createHash,createHmac,randomBytes,randomUUID,timingSafeEqual } from 'node:crypto';
export const token=()=>randomBytes(32).toString('base64url');
export const hash=value=>createHash('sha256').update(Buffer.isBuffer(value)?value:String(value)).digest('hex');
export const keyed=(secret,value)=>createHmac('sha256',secret).update(value).digest('hex');
export const uuid=value=>typeof value==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(value);
export function equal(a,b){
  if(typeof a!=='string'||typeof b!=='string')return false;
  const left=Buffer.from(a),right=Buffer.from(b);
  return left.length===right.length&&timingSafeEqual(left,right);
}
export class Fault extends Error {constructor(status,code,details={}){super(code);this.status=status;this.details=details;}}
export async function transaction(pool,fn){
  const client=await pool.connect();
  try{await client.query('begin');const result=await fn(client);await client.query('commit');return result;}
  catch(error){await client.query('rollback');throw error;}finally{client.release();}
}
export async function rate(db,key,max,seconds){
  const r=await db.query('select app.rate_limit($1,$2,$3) ok',[key,max,seconds]);
  if(!r.rows[0].ok)throw new Fault(429,'rate_limited');
}
export async function guard(db,sessionToken,{browserToken,paid=false,study=false}={}){
  if(!/^[A-Za-z0-9_-]{43}$/.test(sessionToken||'')||!/^[A-Za-z0-9_-]{43}$/.test(browserToken||''))throw new Fault(401,'unauthenticated');
  const {rows}=await db.query(`select s.id session_id,s.user_id,s.device_id,s.authenticated_at,u.email,
    exists(select 1 from app.entitlements e where e.user_id=s.user_id and e.product_id='it1140-lifetime' and e.revoked_at is null) owned,
    l.session_id lease_session,l.expires_at lease_expires,l.generation
    from app.sessions s join app.users u on u.id=s.user_id join app.devices d on d.id=s.device_id
    left join app.leases l on l.user_id=s.user_id
    where s.token_hash=$1 and d.token_hash=$2 and s.revoked_at is null and s.expires_at>now() and u.disabled_at is null and d.revoked_at is null`,[hash(sessionToken),hash(browserToken)]);
  const a=rows[0];if(!a)throw new Fault(401,'unauthenticated');
  if(paid&&!a.owned)throw new Fault(403,'purchase_required');
  if(study&&(a.lease_session!==a.session_id||new Date(a.lease_expires)<=new Date()))throw new Fault(409,'study_conflict');
  return a;
}
export function recent(a){if(Date.now()-new Date(a.authenticated_at).getTime()>10*60000)throw new Fault(403,'reauthenticate');}
export async function devices(db,userId){return (await db.query('select id,label,created_at from app.devices where user_id=$1 and revoked_at is null order by created_at',[userId])).rows;}
export async function issueSession(db,{email,browserToken,label,replaceId}){
  // Caller owns the OTP/enrollment transaction. Account lock covers every slot mutation.
  await db.query('insert into app.users(id,email) values($1,$2) on conflict(email) do nothing',[randomUUID(),email]);
  const u=(await db.query('select * from app.users where email=$1 for update',[email])).rows[0];
  if(u.disabled_at)throw new Fault(403,'account_disabled');
  let known=(await db.query('select * from app.devices where user_id=$1 and token_hash=$2 and revoked_at is null',[u.id,hash(browserToken)])).rows[0];
  const slots=await devices(db,u.id);
  if(!known&&slots.length>=2&&!replaceId)return {limited:true,devices:slots};
  if(!known&&slots.length>=2){
    if(!slots.some(d=>d.id===replaceId))throw new Fault(400,'invalid_device');
    const n=(await db.query("select count(*)::int n from app.device_changes where user_id=$1 and created_at>now()-interval '30 days'",[u.id])).rows[0].n;
    if(n>=2)throw new Fault(429,'replacement_limit');
    await revokeDevice(db,u.id,replaceId,'replacement');
  }
  if(!known){known={id:randomUUID()};await db.query('insert into app.devices(id,user_id,token_hash,label) values($1,$2,$3,$4)',[known.id,u.id,hash(browserToken),label.slice(0,80)]);}
  // A fresh OTP rotates the login on this browser and invalidates copied old session tokens.
  await db.query('update app.sessions set revoked_at=now() where device_id=$1 and revoked_at is null',[known.id]);
  await db.query('delete from app.leases where user_id=$1 and session_id in (select id from app.sessions where device_id=$2)',[u.id,known.id]);
  const sessionToken=token(),sessionId=randomUUID();
  await db.query("insert into app.sessions(id,user_id,device_id,token_hash,expires_at) values($1,$2,$3,$4,now()+interval '7 days')",[sessionId,u.id,known.id,hash(sessionToken)]);
  return {sessionToken,userId:u.id,deviceId:known.id};
}
export async function revokeDevice(db,userId,id,reason){
  const r=await db.query('update app.devices set revoked_at=now() where id=$1 and user_id=$2 and revoked_at is null returning id',[id,userId]);
  if(!r.rows.length)throw new Fault(404,'not_found');
  await db.query('update app.sessions set revoked_at=now() where device_id=$1',[id]);
  await db.query('delete from app.leases where user_id=$1 and session_id in(select id from app.sessions where device_id=$2)',[userId,id]);
  await db.query('insert into app.device_changes(user_id,device_id,reason) values($1,$2,$3)',[userId,id,reason]);
}
export async function claim(db,a,takeover=false){
  // Single atomic upsert, one row per account. Old sessions never auto-take over.
  if(takeover)recent(a);
  const r=await db.query(`insert into app.leases(user_id,session_id,generation,expires_at)
    values($1,$2,$3,now()+interval '5 minutes') on conflict(user_id) do update set
    session_id=excluded.session_id,generation=case when leases.session_id=excluded.session_id then leases.generation else excluded.generation end,
    expires_at=excluded.expires_at,changed_at=now()
    where leases.session_id=excluded.session_id or leases.expires_at<=now() or $4 returning generation`,[a.user_id,a.session_id,randomUUID(),takeover]);
  if(!r.rows[0])throw new Fault(409,'study_conflict');return r.rows[0];
}
