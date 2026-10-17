import { createServer } from 'node:http';
import { isIP } from 'node:net';
import { Readable } from 'node:stream';
import nodemailer from 'nodemailer';
import { configuration } from './config.mjs';
import { database } from './db.mjs';
import { createApp } from './app.mjs';

export function mailTransport(cfg){return nodemailer.createTransport({host:cfg.SMTP_HOST,port:Number(cfg.SMTP_PORT||587),
  secure:cfg.SMTP_SECURE==='true',requireTLS:cfg.SMTP_SECURE!=='true',pool:true,maxConnections:3,
  auth:{user:cfg.SMTP_USER,pass:cfg.SMTP_PASSWORD},connectionTimeout:10000,socketTimeout:15000});}
export function httpServer(app,cfg){
  const server=createServer({maxHeaderSize:16384,requestTimeout:15000,headersTimeout:10000,keepAliveTimeout:65000},async(req,res)=>{
    try{
      if(req.headers.host!==new URL(cfg.origin).host){res.writeHead(421);res.end();return;}
      const controller=new AbortController();req.on('aborted',()=>controller.abort());
      const request=new Request(new URL(req.url,cfg.origin),{method:req.method,headers:req.headers,
        ...(['GET','HEAD'].includes(req.method)?{}:{body:Readable.toWeb(req),duplex:'half'}),signal:controller.signal});
      const forwarded=String(req.headers['x-real-ip']||'');
      const ip=cfg.TRUST_PROXY==='true'&&isIP(forwarded)?forwarded:req.socket.remoteAddress;
      const response=await app.fetch(request,ip);
      res.statusCode=response.status;for(const [name,value] of response.headers)if(name!=='set-cookie')res.setHeader(name,value);
      const setCookies=response.headers.getSetCookie();if(setCookies.length)res.setHeader('Set-Cookie',setCookies);
      if(!response.body||req.method==='HEAD'){res.end();return;}
      Readable.fromWeb(response.body).on('error',()=>res.destroy()).pipe(res);
    }catch{if(!res.headersSent)res.writeHead(503,{'Cache-Control':'no-store'});res.end();}
  });
  server.maxRequestsPerSocket=1000;return server;
}
if(import.meta.url===new URL(process.argv[1],'file:').href){
  const cfg=configuration(),pool=database(cfg.DATABASE_URL,cfg.poolSize),mailer=cfg.smtpReady?mailTransport(cfg):null;
  await pool.query('select 1 from app.products limit 1');
  const app=createApp({pool,cfg,sendMail:message=>mailer.sendMail({from:cfg.SMTP_FROM,...message})});
  const server=httpServer(app,cfg);server.listen(cfg.port,cfg.HOST||'127.0.0.1',()=>console.log(`IT1140 ready on port ${cfg.port}; payments=${cfg.live?'enabled':'disabled'}`));
  let stopping=false;async function stop(){if(stopping)return;stopping=true;server.close(async()=>{mailer?.close();await pool.end();});server.closeIdleConnections();setTimeout(()=>process.exit(1),10000).unref();}
  process.on('SIGTERM',stop);process.on('SIGINT',stop);
}
