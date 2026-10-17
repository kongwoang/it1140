// WORKER_SOURCE is prepended at build time; this file is never served as account JS.
// CSP also applies sandbox allow-scripts, even if opened directly in a tab.
(() => {
  let initialized=false;
  window.addEventListener('message',event=>{
    if(initialized||event.source!==parent||event.origin!==new URL(document.URL).origin||event.data?.type!=='it1140-python-init'||event.ports.length!==1)return;
    initialized=true;const port=event.ports[0];let worker,currentRun;
    port.onmessage=event=>{
      const value=event.data;
      if(!value||value.type!=='run'||!Number.isSafeInteger(value.runId)||typeof value.code!=='string'||value.code.length>100000||!Array.isArray(value.tests)||value.tests.length>100)return;
      currentRun=value.runId;
      if(!worker){
        const url=URL.createObjectURL(new Blob([WORKER_SOURCE],{type:'text/javascript'}));
        worker=new Worker(url);
        worker.onmessage=e=>port.postMessage(e.data);
        worker.onerror=event=>{worker.terminate();worker=undefined;URL.revokeObjectURL(url);port.postMessage({type:'fatal',runId:currentRun,error:'Không khởi động được Python: '+(event.message||'Kiểm tra kết nối tải môi trường thực thi.')});};
      }
      worker.postMessage(value);
    };
    port.postMessage({type:'ready'});
  });
})();
