(() => {
  let rejectReady,resolveReady,stopped=false,heartbeat;
  const ready=new Promise((resolve,reject)=>{resolveReady=resolve;rejectReady=reject;});
  // Both study modules await this promise. Avoid an unhandled rejection if one is absent.
  ready.catch(()=>{});
  function block(message,login=false){
    stopped=true;clearTimeout(heartbeat);
    if(document.getElementById('studyBlock'))return;
    const overlay=document.createElement('div');overlay.id='studyBlock';overlay.className='study-block';
    const card=document.createElement('section'),h=document.createElement('h2'),p=document.createElement('p'),link=document.createElement('a');
    h.textContent='Phiên học tạm dừng';p.textContent=message;link.href='/';link.className='primary-btn';link.textContent=login?'Đăng nhập lại':'Quản lý phiên học';
    card.append(h,p,link);overlay.append(card);document.body.append(overlay);
    // Already delivered material cannot be recalled; hide it and stop this UI's activity.
    document.querySelector('.app-shell')?.setAttribute('inert','');
    window.dispatchEvent(new Event('it1140:study-stopped'));
  }
  async function ping(){
    if(stopped)return;
    try{const response=await fetch('/api/study/heartbeat',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
      if(!response.ok){block(response.status===401?'Vui lòng đăng nhập lại.':'Phiên học không còn hiệu lực. Quay lại tài khoản để tiếp tục.',response.status===401);return;}
    }catch{block('Không kiểm tra được phiên học. Mã và câu trả lời đang viết vẫn được giữ; hãy kết nối mạng và tải lại.');return;}
    heartbeat=setTimeout(ping,55000+Math.random()*10000);
  }
  window.IT1140Study={ready,block};
  (async()=>{
    try{const response=await fetch('/api/study/claim',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
      if(!response.ok)throw Error(response.status===409?'Một trình duyệt khác đang học. Quay lại tài khoản để chuyển phiên.':'Bạn cần đăng nhập và có quyền học.');
      resolveReady();heartbeat=setTimeout(ping,55000+Math.random()*10000);
    }catch(error){block(error.message);rejectReady(error);}
  })();
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!stopped){clearTimeout(heartbeat);ping();}});
})();
