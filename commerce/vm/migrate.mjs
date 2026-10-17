import { readFile,readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { database } from './db.mjs';
export async function migrate(pool){
  const db=await pool.connect();
  try{
    await db.query("select pg_advisory_lock(1140,1)");
    await db.query('create table if not exists public.it1140_migrations(name text primary key,sha256 text not null,applied_at timestamptz not null default now())');
    const names=(await readdir(new URL('./migrations/',import.meta.url))).filter(n=>/^\d+-.*\.sql$/.test(n)).sort();
    for(const name of names){
      const sql=await readFile(new URL('./migrations/'+name,import.meta.url),'utf8'),sha=createHash('sha256').update(sql).digest('hex');
      const old=(await db.query('select sha256 from public.it1140_migrations where name=$1',[name])).rows[0];
      if(old){if(old.sha256!==sha)throw Error('Migration checksum changed: '+name);continue;}
      await db.query('begin');try{await db.query(sql);await db.query('insert into public.it1140_migrations(name,sha256) values($1,$2)',[name,sha]);await db.query('commit');}catch(e){await db.query('rollback');throw e;}
    }
  }finally{await db.query('select pg_advisory_unlock(1140,1)');db.release();}
}
if(import.meta.url===new URL(process.argv[1],'file:').href){
  const read=async name=>process.env[name+'_FILE']?(await readFile(process.env[name+'_FILE'],'utf8')).trim():process.env[name];
  const url=await read('MIGRATION_DATABASE_URL');if(!url)throw Error('MIGRATION_DATABASE_URL required; never run migrations with the runtime role');
  const pool=database(url,1);
  try{
    await migrate(pool);
    const password=await read('APP_DATABASE_PASSWORD');if(!password||password.length<32)throw Error('APP_DATABASE_PASSWORD requires 32+ random characters');
    const role=(await pool.query("select 1 from pg_roles where rolname='it1140_app'")).rows.length;
    if(!role){const sql=(await pool.query("select format('create role it1140_app login password %L',$1::text) sql",[password])).rows[0].sql;await pool.query(sql);}
    await pool.query('revoke create on schema public from public; grant usage on schema app to it1140_app; grant select,insert,update,delete on all tables in schema app to it1140_app; grant usage,select on all sequences in schema app to it1140_app; grant execute on all functions in schema app to it1140_app; revoke all on public.it1140_migrations from it1140_app');
    console.log('Migrations verified; runtime role has app DML only.');
  }finally{await pool.end();}
}
