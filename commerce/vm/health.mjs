const origin=process.env.APP_ORIGIN;
const r=await fetch('http://127.0.0.1:4180/healthz',{headers:{host:new URL(origin).host},signal:AbortSignal.timeout(3000)});
if(!r.ok)process.exit(1);
