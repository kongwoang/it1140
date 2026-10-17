import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { request } from 'node:http';
import { fixture } from './helpers.mjs';
import { httpServer } from '../server.mjs';

test('native HTTP bridge and exact-host healthcheck',{skip:process.env.HTTP_SMOKE!=='true'},async()=>{
  const f=await fixture(),server=httpServer(f.app,f.cfg);
  try{
    await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
    f.cfg.port=server.address().port;f.cfg.origin='http://localhost:'+f.cfg.port;
    const run=spawn(process.execPath,[new URL('../health.mjs',import.meta.url).pathname],{env:{...process.env,APP_ORIGIN:f.cfg.origin,PORT:String(f.cfg.port)},stdio:'ignore'});
    assert.equal(await new Promise((resolve,reject)=>{run.once('error',reject);run.once('exit',resolve);}),0);
    const status=await new Promise((resolve,reject)=>{
      const req=request({hostname:'127.0.0.1',port:f.cfg.port,path:'/healthz',headers:{Host:'evil.example'}},res=>{res.resume();resolve(res.statusCode);});req.once('error',reject);req.end();
    });assert.equal(status,421);
  }finally{await new Promise(resolve=>server.close(resolve));await f.close();}
});
