// UI preview: local-only disposable DB, no account/payment bypass and no sent email.
import { fixture } from './helpers.mjs';
import { httpServer } from '../server.mjs';
import { createApp } from '../app.mjs';
import { randomUUID } from 'node:crypto';
import { mkdtemp,writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const f=await fixture(),interactive=process.env.PREVIEW_INTERACTIVE==='true';f.cfg.smtpReady=interactive;
const inbox=interactive?await mkdtemp(join(tmpdir(),'it1140-preview-inbox-')):null;
if(interactive){const id=randomUUID();await f.pool.query("insert into app.users(id,email) values($1,'preview@sis.hust.edu.vn')",[id]);await f.pool.query("insert into app.entitlements(user_id,product_id) values($1,'it1140-lifetime')",[id]);}
const app=createApp({pool:f.pool,cfg:f.cfg,sendMail:async message=>{
  if(!interactive)throw Error('Preview does not send mail');
  await writeFile(join(inbox,'latest.json'),JSON.stringify(message),{mode:0o600});
}});
const server=httpServer(app,f.cfg);server.listen(4180,'127.0.0.1',()=>console.log('Local preview: http://localhost:4180; payments and real mail disabled.'+(interactive?' Synthetic inbox directory: '+inbox:'')));
process.on('SIGINT',()=>server.close(async()=>{await f.close();}));
