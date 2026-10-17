// The parent owns a MessageChannel to an opaque-origin, sandboxed iframe.
// No Python or worker-supplied code ever executes in this account origin.
(() => {
  class PythonSandbox extends EventTarget {
    constructor(){
      super();this.pending=[];this.closed=false;
      const channel=new MessageChannel();this.port=channel.port1;
      this.frame=document.createElement('iframe');this.frame.hidden=true;
      this.frame.title='Môi trường Python cách ly';this.frame.setAttribute('sandbox','allow-scripts');
      this.frame.referrerPolicy='no-referrer';this.frame.src='/python-sandbox.html';
      this.timer=setTimeout(()=>this.fail('Không khởi động được vùng cách ly Python.'),15000);
      this.port.onmessage=event=>{
        if(this.closed)return;
        if(event.data?.type==='ready'){clearTimeout(this.timer);this.ready=true;for(const value of this.pending)this.port.postMessage(value);this.pending=[];return;}
        const value=event.data;
        if(!value||!Number.isSafeInteger(value.runId)||value.runId!==this.runId)return;
        // Do not forward arbitrary capabilities, markup or commands from the runner.
        const short=v=>typeof v==='string'?v.slice(0,1048576):'';
        let message;
        if(value.type==='status'&&['loading','packages'].includes(value.status))message={type:'status',runId:value.runId,status:value.status};
        else if(value.type==='fatal')message={type:'fatal',runId:value.runId,error:short(value.error)};
        else if(value.type==='result')message={type:'result',runId:value.runId,mode:value.mode==='single'?'single':'tests',output:short(value.output),error:short(value.error),
          tests:Array.isArray(value.tests)?value.tests.slice(0,100).map(t=>({label:short(t?.label),passed:t?.passed===true,error:short(t?.error)})):[],
          plot:typeof value.plot==='string'&&value.plot.length<=8388608&&/^[A-Za-z0-9+/=]*$/.test(value.plot)?value.plot:''};
        if(message)this.dispatchEvent(new MessageEvent('message',{data:message}));
      };
      this.port.onmessageerror=()=>this.fail('Dữ liệu từ môi trường Python không hợp lệ.');
      this.frame.addEventListener('load',()=>{if(!this.closed)this.frame.contentWindow.postMessage({type:'it1140-python-init'},'*',[channel.port2]);},{once:true});
      this.frame.addEventListener('error',()=>this.fail('Không tải được vùng cách ly Python.'),{once:true});
      document.body.append(this.frame);
    }
    postMessage(value){
      if(this.closed)return;
      this.runId=value.runId;
      if(this.ready)this.port.postMessage(value);else this.pending=[value];
    }
    fail(message){if(this.closed)return;this.dispatchEvent(new ErrorEvent('error',{message}));this.terminate();}
    terminate(){this.closed=true;clearTimeout(this.timer);this.pending=[];this.port.close();this.frame.remove();}
  }
  window.IT1140CreatePythonWorker=()=>new PythonSandbox();
})();
