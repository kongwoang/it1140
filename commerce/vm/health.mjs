import { request } from 'node:http';
// Native HTTP preserves Host explicitly; fetch may rewrite this header to the
// loopback URL, which the application's exact-host guard correctly rejects.
const req=request({hostname:'127.0.0.1',port:Number(process.env.PORT||4180),path:'/healthz',
  headers:{Host:new URL(process.env.APP_ORIGIN).host}},res=>{res.resume();if(res.statusCode!==200)process.exitCode=1;});
req.setTimeout(3000,()=>req.destroy(new Error('health_timeout')));
req.on('error',()=>{process.exitCode=1;});req.end();
