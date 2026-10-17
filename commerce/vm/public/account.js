(() => {
  const $=id=>document.getElementById(id),money=n=>new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND'}).format(n);
  let config,challengeId,orderId,poll,timer;
  const messages={hust_email_required:'Hãy dùng đúng email HUST được hỗ trợ.',invalid_otp:'Mã sai, đã dùng hoặc hết hạn. Mỗi mã được nhập tối đa 5 lần.',otp_cooldown:'Chờ 60 giây trước khi xin mã mới.',rate_limited:'Bạn thao tác quá nhanh. Vui lòng thử lại sau.',replacement_limit:'Đã hết lượt tự thay trình duyệt trong 30 ngày. Hãy liên hệ hỗ trợ.',reauthenticate:'Hãy xác minh lại bằng OTP trước khi thực hiện thao tác này.',study_conflict:'Một trình duyệt khác đang học bằng tài khoản này.',unauthenticated:'Vui lòng đăng nhập lại.',sales_disabled:'Thanh toán chưa được mở.',mail_not_configured:'Hệ thống đang chờ cấu hình gửi email.',mail_unavailable:'Chưa gửi được email. Hãy thử lại sau.',purchase_required:'Tài khoản chưa có quyền học.',invalid_enrollment:'Lượt xác minh đã hết hạn. Hãy xin mã mới.',service_unavailable:'Dịch vụ tạm thời chưa sẵn sàng.',account_disabled:'Tài khoản đang tạm khóa. Vui lòng liên hệ hỗ trợ.'};
  function status(message,error=false){$('status').textContent=message;$('status').classList.toggle('error',error);}
  async function api(path,data){
    const r=await fetch(path,{credentials:'same-origin',cache:'no-store',...(data===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})});
    const v=await r.json();if(!r.ok){const e=Error(messages[v.error]||'Không thể thực hiện. Vui lòng thử lại.');e.code=v.error;e.data=v;throw e;}return v;
  }
  function action(button,fn){button.addEventListener('click',async()=>{button.disabled=true;try{await fn();}catch(e){status(e.message,true);}finally{button.disabled=false;}});}
  function authView(){clearInterval(poll);$('emailForm').hidden=false;$('otpForm').hidden=true;$('member').hidden=true;$('order').hidden=true;$('enrollment').hidden=true;$('requestOtp').disabled=!config?.ready;}
  async function showMember(){
    try{const a=await api('/api/me');$('emailForm').hidden=$('otpForm').hidden=$('enrollment').hidden=true;$('member').hidden=false;$('identity').textContent=a.email;
      $('buy').hidden=a.lifetime;$('buy').disabled=!config.paymentsEnabled;$('enter').hidden=!a.lifetime;$('buy').textContent='Mua quyền học · '+money(config.price);
      status(a.lifetime?'Bạn đã có quyền học IT1140 không thời hạn.':config.paymentsEnabled?'Tài khoản chưa mua quyền học.':'Đăng nhập thành công. Thanh toán chưa mở.');
      const d=await api('/api/devices');renderDevices(d.devices,false,d.current);
    }catch(e){if(e.code==='unauthenticated'){authView();status('Đăng nhập bằng email HUST để tiếp tục.');}else throw e;}
  }
  function renderDevices(list,replacing=false,current){
    const box=$(replacing?'replaceList':'deviceList');box.replaceChildren();
    for(const d of list){const row=document.createElement('div'),p=document.createElement('p'),b=document.createElement('button');p.textContent=d.label+(d.id===current?' · Đang dùng':'');b.className='secondary';b.textContent=replacing?'Thay trình duyệt này':'Thu hồi trình duyệt';
      action(b,async()=>{if(!confirm(replacing?'Thu hồi phiên trên trình duyệt này và đăng nhập tại đây?':'Thu hồi mọi phiên trên trình duyệt này?'))return;
        if(replacing){await api('/api/auth/enroll',{replaceId:d.id,label:$('label').value});await showMember();}
        else{await api('/api/devices/revoke',{id:d.id});await showMember();}});
      row.append(p,b);box.append(row);}
  }
  $('emailForm').addEventListener('submit',async e=>{e.preventDefault();$('requestOtp').disabled=true;
    try{const r=await api('/api/auth/request',{email:$('email').value});challengeId=r.challengeId;$('otp').value='';$('emailForm').hidden=true;$('otpForm').hidden=false;$('enrollment').hidden=true;$('otp').focus();status('Mã đã được gửi. Kiểm tra cả thư rác; mã có hiệu lực 10 phút.');
      clearTimeout(timer);timer=setTimeout(()=>{$('requestOtp').disabled=false;},60000);
    }catch(error){status(error.message,true);$('requestOtp').disabled=false;}});
  $('otpForm').addEventListener('submit',async e=>{e.preventDefault();$('verifyOtp').disabled=true;
    try{await api('/api/auth/verify',{challengeId,code:$('otp').value,label:$('label').value});$('otp').value='';await showMember();}
    catch(error){if(error.code==='device_limit'){$('otpForm').hidden=true;$('enrollment').hidden=false;renderDevices(error.data.devices,true);status('Xác minh thành công. Hãy chọn một trình duyệt để thay thế.');}else status(error.message,true);}
    finally{$('verifyOtp').disabled=false;}});
  action($('changeEmail'),async()=>{authView();status('Nhập email để xin mã mới. Mỗi lần gửi cách nhau ít nhất 60 giây.');});
  action($('reauth'),async()=>{authView();status('Nhập lại email đang dùng để xác minh. Quyền đã mua vẫn được giữ.');});
  action($('logout'),async()=>{await api('/api/auth/logout',{});authView();status('Đã đăng xuất.');});
  async function enter(takeover){await api('/api/study/claim',{takeover});location.assign('/learn');}
  action($('enter'),async()=>{try{await enter(false);}catch(e){if(e.code==='study_conflict'){$('takeover').hidden=false;status(e.message+' Bạn có thể chuyển phiên sang đây.');}else throw e;}});
  action($('takeover'),async()=>{if(confirm('Chuyển phiên học sang đây? Trình duyệt cũ sẽ không tiếp tục lấy đề hoặc chấm bài được.'))await enter(true);});
  async function check(){
    if(!orderId)return;const o=await api('/api/orders/'+orderId);
    if(o.status==='paid'){clearInterval(poll);orderId=null;$('order').hidden=true;await showMember();return;}
    if(o.needsReview||o.status==='cancelled'||new Date(o.expiresAt)<new Date()){clearInterval(poll);status('Đơn cần đối soát hoặc đã hết hạn. Nếu đã chuyển tiền, hãy liên hệ hỗ trợ; không chuyển lại cho đơn này.',true);return;}
    status('Đang chờ tiền về. Không cần chuyển lại nếu bạn đã thanh toán.');
  }
  action($('buy'),async()=>{const o=await api('/api/orders',{});orderId=o.id;$('order').hidden=false;$('qr').src=o.qrUrl;$('amount').textContent=money(o.amount);$('holder').textContent=o.accountName;$('account').textContent=o.account;$('code').textContent=o.code;$('expiry').textContent=new Date(o.expiresAt).toLocaleString('vi-VN');clearInterval(poll);poll=setInterval(()=>{if(!document.hidden)check().catch(e=>{clearInterval(poll);status(e.message,true);});},10000);status('Chuyển khoản đúng thông tin của đơn bên dưới.');});
  action($('check'),check);
  (async()=>{try{
    if('serviceWorker'in navigator){await navigator.serviceWorker.register('/commerce-sw.js',{updateViaCache:'none'});
      if(!navigator.serviceWorker.controller?.scriptURL.endsWith('/commerce-sw.js'))await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('Hãy đóng các tab IT1140 cũ rồi mở lại để cập nhật.')),10000);function changed(){if(navigator.serviceWorker.controller?.scriptURL.endsWith('/commerce-sw.js')){clearTimeout(t);navigator.serviceWorker.removeEventListener('controllerchange',changed);resolve();}}navigator.serviceWorker.addEventListener('controllerchange',changed);changed();});}
    config=await api('/api/config');$('price').textContent=money(config.price);if(config.supportEmail){$('support').hidden=false;$('support').href='mailto:'+config.supportEmail;}
    $('email').placeholder='ten@'+config.domains[0];if(!config.ready){status('Bản thương mại đang chờ cấu hình gửi email, chưa mở bán.');return;}await showMember();
  }catch(e){status(e.message,true);}})();
})();
