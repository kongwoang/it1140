(async function () {
  // Supabase confirmation redirects can contain transient tokens. This app uses
  // server HttpOnly cookies instead; don't retain tokens in URL/history/storage.
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  const el = Object.fromEntries(['status','authForm','email','password','login','signup','member','identity','purchase','buy','learn','logout','order','qr','orderAmount','accountName','accountNumber','transferCode','expires','check','price','support'].map(id => [id, document.getElementById(id)]));
  const money = n => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
  let config;
  let orderId;
  let poll;
  let refreshing;
  const errors = { unauthenticated: 'Vui lòng đăng nhập.', invalid_login: 'Email hoặc mật khẩu chưa đúng, hoặc email chưa được xác nhận.', invalid_credentials: 'Kiểm tra email và mật khẩu (12–128 ký tự).', rate_limited: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.', sales_disabled: 'Thanh toán chưa được mở. Vui lòng quay lại sau.', already_owned: 'Tài khoản đã có quyền học.', verify_email: 'Vui lòng xác nhận email trước khi đăng nhập.', purchase_required: 'Tài khoản chưa có quyền học.', not_configured: 'Hệ thống đang được chuẩn bị, chưa mở bán.', service_unavailable: 'Dịch vụ tạm thời chưa sẵn sàng. Vui lòng thử lại sau.' };
  function status(message, error = false) { el.status.textContent = message; el.status.classList.toggle('error', error); }
  async function request(path, options = {}, retry = true) {
    const response = await fetch(path, { credentials: 'same-origin', cache: 'no-store', ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers } });
    if (response.status === 401 && retry && !path.startsWith('/api/auth/')) {
      if (!refreshing) refreshing = request('/api/auth/refresh', { method: 'POST' }, false).finally(() => { refreshing = null; });
      try { await refreshing; return request(path, options, false); } catch { /* original unauthorized below */ }
    }
    const data = await response.json();
    if (!response.ok) { const error = new Error(errors[data.error] || 'Không thể thực hiện yêu cầu. Vui lòng thử lại sau.'); error.code = data.error; throw error; }
    return data;
  }
  async function migration() {
    if (!('serviceWorker' in navigator)) return;
    const registration = await navigator.serviceWorker.register('/commerce-sw.js', { updateViaCache: 'none' });
    await registration.update();
    if (navigator.serviceWorker.controller?.scriptURL.endsWith('/commerce-sw.js')) return;
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Hãy đóng các tab IT1140 cũ rồi mở lại để cập nhật hệ thống.')), 10000);
      function changed() {
        if (navigator.serviceWorker.controller?.scriptURL.endsWith('/commerce-sw.js')) {
          clearTimeout(timeout); navigator.serviceWorker.removeEventListener('controllerchange', changed); resolve();
        }
      }
      navigator.serviceWorker.addEventListener('controllerchange', changed); changed();
    });
  }
  async function member() {
    try {
      const account = await request('/api/me');
      el.authForm.hidden = true; el.member.hidden = false;
      el.identity.textContent = account.email;
      el.learn.hidden = !account.lifetime; el.purchase.hidden = account.lifetime;
      el.buy.disabled = !config.paymentsEnabled;
      status(account.lifetime ? 'Bạn đã có quyền học IT1140 không thời hạn.' : config.paymentsEnabled ? 'Đăng nhập thành công. Bạn có thể mua quyền học.' : 'Đăng nhập thành công. Thanh toán chưa được mở.');
      return account;
    } catch (error) {
      if (error.code !== 'unauthenticated') throw error;
      el.authForm.hidden = false; el.member.hidden = true; el.order.hidden = true;
      status('Đăng nhập hoặc tạo tài khoản để tiếp tục.');
    }
  }
  async function checkOrder() {
    if (!orderId) return;
    const order = await request('/api/orders/' + orderId);
    if (order.status === 'paid') { clearInterval(poll); orderId = null; el.order.hidden = true; await member(); return; }
    if (order.needsReview) { clearInterval(poll); status('Có giao dịch cần đối soát. Vui lòng liên hệ hỗ trợ, không chuyển thêm tiền cho đơn này.', true); return; }
    if (Date.parse(order.expiresAt) < Date.now()) {
      clearInterval(poll); status('Đơn đã quá thời hạn. Nếu bạn đã chuyển tiền, vui lòng liên hệ hỗ trợ để đối soát; không chuyển thêm cho đơn này.', true); return;
    }
    status('Đang chờ xác nhận tiền về. Chưa cần chuyển lại nếu bạn đã thanh toán.');
  }
  async function auth(signup) {
    if (!el.authForm.reportValidity()) return;
    el.login.disabled = el.signup.disabled = true;
    try {
      const result = await request('/api/auth/' + (signup ? 'signup' : 'login'), { method: 'POST', body: JSON.stringify({ email: el.email.value.trim(), password: el.password.value }) });
      el.password.value = '';
      if (signup) status(result.message); else await member();
    } catch (error) { status(error.message, true); }
    finally { el.login.disabled = el.signup.disabled = !config?.ready; }
  }
  el.authForm.addEventListener('submit', event => { event.preventDefault(); auth(false); });
  el.signup.addEventListener('click', () => auth(true));
  el.logout.addEventListener('click', async () => {
    clearInterval(poll); orderId = null;
    try { await request('/api/auth/logout', { method: 'POST' }); await member(); } catch (error) { status(error.message, true); }
  });
  el.buy.addEventListener('click', async () => {
    el.buy.disabled = true;
    try {
      const order = await request('/api/orders', { method: 'POST', body: '{}' });
      orderId = order.id;
      el.orderAmount.textContent = money(order.amount); el.accountName.textContent = order.accountName;
      el.accountNumber.textContent = order.account; el.transferCode.textContent = order.code;
      el.expires.textContent = new Date(order.expiresAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
      el.qr.src = order.qrUrl; el.order.hidden = false;
      clearInterval(poll); poll = setInterval(() => { if (!document.hidden) checkOrder().catch(error => { clearInterval(poll); status(error.message, true); }); }, 10000);
      status('Đơn đã tạo. Chuyển khoản đúng thông tin bên dưới.');
    } catch (error) { status(error.message, true); }
    finally { el.buy.disabled = !config?.paymentsEnabled; }
  });
  el.check.addEventListener('click', () => checkOrder().catch(error => status(error.message, true)));
  try {
    await migration();
    config = await request('/api/config');
    if (config.supportEmail) { el.support.href = 'mailto:' + config.supportEmail; el.support.hidden = false; }
    el.price.textContent = money(config.price); el.buy.textContent = 'Mua quyền học · ' + money(config.price);
    if (!config.ready) { status('Bản thương mại đang được cấu hình, chưa mở bán.'); return; }
    el.login.disabled = el.signup.disabled = false;
    await member();
  } catch (error) { status(error.message, true); }
})();
