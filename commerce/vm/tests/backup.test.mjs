import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,readFile,stat,writeFile,symlink,rm } from 'node:fs/promises';
import { writeSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { privateDatabaseBackup } from '../database-backup.mjs';
import { spawnSync } from 'node:child_process';

test('database backups are private, exclusive and do not reopen the output path',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'it1140-backup-test-'));
  try{
    const file=join(dir,'backup.dump');let called=0;
    const spawn=(command,args,options)=>{called++;assert.equal(command,'pg_dump');assert.equal(args.includes('--file'),false);assert.equal(options.env.PGDATABASE,'test-only');writeSync(options.stdio[1],Buffer.from('PGDMP-test-only'));return {status:0};};
    await privateDatabaseBackup(file,{PGDATABASE:'test-only'},spawn);
    assert.equal((await stat(file)).mode&0o777,0o600);assert.equal(await readFile(file,'utf8'),'PGDMP-test-only');
    await assert.rejects(privateDatabaseBackup(file,{},spawn),{code:'EEXIST'});assert.equal(called,1);
    const victim=join(dir,'keep.txt'),link=join(dir,'link.dump');await writeFile(victim,'keep');await symlink(victim,link);
    await assert.rejects(privateDatabaseBackup(link,{},spawn),{code:'EEXIST'});assert.equal(await readFile(victim,'utf8'),'keep');
    await assert.rejects(privateDatabaseBackup('relative.dump',{},spawn),/absolute/);
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('failed backup keeps a clearly unsuccessful private partial file, never overwrites a prior backup',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'it1140-backup-test-'));
  try{
    const file=join(dir,'failed.dump');
    await assert.rejects(privateDatabaseBackup(file,{},()=>({status:1})),/partial private backup/);
    assert.equal((await stat(file)).mode&0o777,0o600);
    await assert.rejects(privateDatabaseBackup(file,{},()=>({status:0})),{code:'EEXIST'});
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('database recovery commands do not depend on a healthy content mount or web startup config',()=>{
  const result=spawnSync(process.execPath,[new URL('../ops.mjs',import.meta.url).pathname,'backup','--file','/not-created-test-only.dump'],{encoding:'utf8',timeout:10000,env:{PATH:process.env.PATH,NODE_ENV:'production',COURSE_DATA_DIR:'/not-present-test-only-content'}});
  assert.equal(result.status,1);assert.match(result.stderr,/MIGRATION_DATABASE_URL required/);
  assert.doesNotMatch(result.stderr,/Production requires|ENOENT|APP_ORIGIN|Invalid course content/);
});
