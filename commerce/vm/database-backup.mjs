import { open } from 'node:fs/promises';
import { isAbsolute } from 'node:path';
import { spawnSync } from 'node:child_process';

export async function privateDatabaseBackup(filename, env, spawn = spawnSync) {
  if(typeof filename!=='string'||!isAbsolute(filename))throw Error('Use an absolute backup path');
  // Exclusive creation refuses symlinks/existing backups. Stream binary output
  // into the already-open private descriptor: do not re-open a pathname in a
  // writable directory and do not rely on an operator's potentially broad umask.
  const file=await open(filename,'wx',0o600);
  try {
    const result=spawn('pg_dump',['--format=custom','--no-owner','--no-acl'],{env,stdio:['ignore',file.fd,'inherit']});
    if(result.error)throw Error('Install PostgreSQL client tools. An empty private backup file may remain; no prior backup was overwritten.');
    if(result.status!==0)throw Error('pg_dump failed. A partial private backup remains; do not use it for restore.');
    await file.sync();
  } finally {await file.close();}
}
