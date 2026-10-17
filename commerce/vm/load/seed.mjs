import { writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { database } from '../db.mjs';
import { hash,token,transaction } from '../store.mjs';
import { stagingOrigin } from '../config.mjs';
const url=process.env.DATABASE_URL,origin=process.env.APP_ORIGIN;
if(process.env.ALLOW_LOAD_SEED!=='true'||process.env.PAYMENTS_ENABLED==='true'||!url||!new URL(url).pathname.endsWith('_loadtest'))throw Error('Dedicated *_loadtest database, ALLOW_LOAD_SEED=true and payments disabled required');
if(!stagingOrigin(origin))throw Error('Staging/localhost APP_ORIGIN required');
const count=Number(process.env.LOAD_USERS||1000);if(!Number.isInteger(count)||count<1||count>1500)throw Error('LOAD_USERS must be 1–1500');
const pool=database(url,2),fixture=[];
try{
  if((await pool.query('select count(*)::int n from app.users')).rows[0].n>0)throw Error('Load seeding requires an EMPTY dedicated database. Do not reseed an active DB.');
  await transaction(pool,async db=>{
    for(let i=0;i<count;i++){
      const user=randomUUID(),device=randomUUID(),session=randomUUID(),secret=token();
      await db.query('insert into app.users(id,email) values($1,$2)',[user,`load-${i}@example.invalid`]);
      await db.query("insert into app.devices(id,user_id,token_hash,label) values($1,$2,$3,'Synthetic load browser')",[device,user,hash(token())]);
      await db.query("insert into app.sessions(id,user_id,device_id,token_hash,expires_at) values($1,$2,$3,$4,now()+interval '2 hours')",[session,user,device,hash(secret)]);
      await db.query("insert into app.entitlements(user_id,product_id) values($1,'it1140-lifetime')",[user]);
      fixture.push({cookie:(origin.startsWith('https:')?'__Host-it1140-':'it1140-dev-')+'session='+secret});
    }
  });
  await writeFile(new URL('./fixtures.json',import.meta.url),JSON.stringify({origin,createdAt:new Date().toISOString(),users:fixture}),{mode:0o600,flag:'wx'});
  console.log(`Seeded ${count} synthetic sessions. Fixture expires in two hours; no real mail or bank request was sent.`);
}finally{await pool.end();}
