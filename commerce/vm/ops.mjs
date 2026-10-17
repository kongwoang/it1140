import { randomBytes } from 'node:crypto';
import { mkdir,writeFile,readFile,readdir,chown } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { configuration } from './config.mjs';
import { database } from './db.mjs';
import { mailTransport } from './server.mjs';
import { transaction,uuid } from './store.mjs';
import { emailAddress } from './app.mjs';
const [command,...args]=process.argv.slice(2);
const option=name=>{const i=args.indexOf('--'+name);return i>=0?args[i+1]:undefined;};

if(command==='init-secrets'){
  const dir=resolve(import.meta.dirname,'deploy/secrets');await mkdir(dir,{recursive:true,mode:0o700});
  if((await readdir(dir)).length)throw Error('Secrets directory is not empty. Refusing to create a mixed set of credentials.');
  const owner=randomBytes(32).toString('hex'),app=randomBytes(32).toString('hex');
  const files={db_owner_password:owner,app_database_password:app,
    migration_database_url:`postgresql://it1140_owner:${owner}@db:5432/it1140`,
    runtime_database_url:`postgresql://it1140_app:${app}@db:5432/it1140`,
    otp_secret:randomBytes(48).toString('hex'),sepay_secret:randomBytes(32).toString('hex'),smtp_password:''};
  // Exclusive creation: never overwrite an existing database password or signing key.
  for(const [name,content] of Object.entries(files)){
    const path=resolve(dir,name);await writeFile(path,content+'\n',{flag:'wx',mode:0o600});
    if(process.platform==='linux'&&process.getuid?.()===0)await chown(path,1000,1000);
  }
  console.log('Created local secrets without printing values. Fill smtp_password securely, then set .env. Do not commit secrets.');
}else if(command==='backup'||command==='restore'){
  const filename=option('file');if(!filename)throw Error('--file absolute-path required');
  if(!filename.startsWith('/'))throw Error('Use an absolute backup path');
  const url=process.env.MIGRATION_DATABASE_URL_FILE?(await readFile(process.env.MIGRATION_DATABASE_URL_FILE,'utf8')).trim():process.env.MIGRATION_DATABASE_URL;
  if(!url)throw Error('MIGRATION_DATABASE_URL required');
  const u=new URL(url),env={...process.env,PGHOST:u.hostname,PGPORT:u.port||'5432',PGUSER:decodeURIComponent(u.username),PGPASSWORD:decodeURIComponent(u.password),PGDATABASE:u.pathname.slice(1)};
  if(command==='restore'&&option('confirm')!=='RESTORE_TO_EMPTY_DATABASE')throw Error('Restore only to a new empty DB: --confirm RESTORE_TO_EMPTY_DATABASE');
  // No --clean: an accidental restore cannot silently drop an existing database.
  const r=spawnSync(command==='backup'?'pg_dump':'pg_restore',command==='backup'?['--format=custom','--no-owner','--no-acl','--file',filename]:['--exit-on-error','--single-transaction','--no-owner','--no-acl','--dbname',env.PGDATABASE,filename],{env,stdio:'inherit'});
  if(r.error)throw Error('Install PostgreSQL client tools on the operator host.');if(r.status!==0)process.exit(r.status||1);
}else{
  const cfg=configuration(),pool=database(cfg.DATABASE_URL,2);
  try{
    if(command==='preflight'){
      await pool.query('select 1 from app.products');
      const role=(await pool.query('select rolsuper,rolcreatedb,rolcreaterole from pg_roles where rolname=current_user')).rows[0];
      if(role.rolsuper||role.rolcreatedb||role.rolcreaterole)throw Error('Runtime DB role is overprivileged');
      const privileges=(await pool.query("select has_schema_privilege(current_user,'app','CREATE') ddl,has_table_privilege(current_user,'public.it1140_migrations','SELECT') migrations")).rows[0];
      if(privileges.ddl||privileges.migrations)throw Error('Runtime role must not own schema or access migration control table');
      if(cfg.smtpReady){const smtp=mailTransport(cfg);try{await smtp.verify();}finally{smtp.close();}}
      console.log(JSON.stringify({database:true,smtp:cfg.smtpReady,payments:cfg.live,domains:cfg.domains,origin:cfg.origin}));
    }else if(command==='status'){
      const r=await pool.query("select (select count(*) from app.users) users,(select count(*) from app.entitlements where revoked_at is null) entitled,(select count(*) from app.payments where outcome='review') review_payments,(select count(*) from app.leases where expires_at>now()) active_study");console.log(JSON.stringify(r.rows[0]));
    }else if(command==='reviews'){
      const r=await pool.query("select transaction_id,order_id,amount,reason,bank_time,received_at from app.payments where outcome='review' order by received_at desc limit 100");console.log(JSON.stringify(r.rows,null,2));
    }else if(command==='prune'){
      await transaction(pool,async db=>{await db.query("delete from app.otp where created_at<now()-interval '2 days'");await db.query("delete from app.rate_limits where window_start<now()-interval '2 days'");await db.query("delete from app.exams where created_at<now()-interval '30 days'");});console.log('Pruned expired OTP/rate-limit and old practice exams; no payments, entitlements, users or drafts removed.');
    }else if(['reset-devices','disable-user','restore-user','transfer-email'].includes(command)){
      const id=option('user'),reason=option('reason'),actor=option('actor');
      if(!uuid(id)||!reason||reason.length<10||!actor||option('confirm')!==command.toUpperCase())throw Error('Require --user UUID --reason detailed-reason --actor operator --confirm '+command.toUpperCase());
      await transaction(pool,async db=>{
        const u=(await db.query('select * from app.users where id=$1 for update',[id])).rows[0];if(!u)throw Error('User not found');
        if(command==='disable-user')await db.query('update app.users set disabled_at=now() where id=$1',[id]);
        if(command==='restore-user')await db.query('update app.users set disabled_at=null where id=$1',[id]);
        if(command==='transfer-email'){
          const email=emailAddress(option('email'),null);if(!email)throw Error('Invalid email');
          const external=!emailAddress(email,cfg.domains);if(external&&!args.includes('--allow-external'))throw Error('External address requires --allow-external after ownership verification');
          await db.query('update app.users set email=$2,email_exception=$3 where id=$1',[id,email,external]);
        }
        if(command!=='restore-user'){
          await db.query('update app.sessions set revoked_at=now() where user_id=$1',[id]);await db.query('delete from app.leases where user_id=$1',[id]);
          await db.query('update app.devices set revoked_at=now() where user_id=$1',[id]);
          // Recovery also consumes any pending OTP/enrollment issued to the prior email.
          await db.query('update app.otp set consumed_at=now() where email=$1',[u.email]);
        }
        await db.query('insert into app.audit(actor,action,target,reason) values($1,$2,$3,$4)',[actor,command,id,reason]);
      });console.log('Completed audited account maintenance; purchase entitlement preserved.');
    }else throw Error('Commands: init-secrets, preflight, status, reviews, prune, reset-devices, disable-user, restore-user, transfer-email, backup, restore');
  }finally{await pool.end();}
}
