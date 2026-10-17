import bank from '../data/subjects/it1140.json' with { type: 'json' };
import exercises from '../data/python-exercises.json' with { type: 'json' };

const encoder = new TextEncoder();
const PRODUCT = 'it1140-lifetime';
const ACCESS = '__Host-it1140-access';
const REFRESH = '__Host-it1140-refresh';
const uuidPattern = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const cookie = (name, value, age) => `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;
const digest = async value => [...new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)))].map(x => x.toString(16).padStart(2, '0')).join('');

class HttpError extends Error {
  constructor(status, code) { super(code); this.status = status; }
}
function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
function cookies(request) {
  const values = new Map();
  for (const pair of (request.headers.get('Cookie') || '').split(';')) {
    const i = pair.indexOf('=');
    if (i < 0) continue;
    try { values.set(pair.slice(0, i).trim(), decodeURIComponent(pair.slice(i + 1))); } catch { /* Invalid cookie is unauthenticated. */ }
  }
  return values;
}
function secure(response) {
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'private, no-store, max-age=0');
  headers.set('Pragma', 'no-cache');
  headers.set('Vary', 'Cookie');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'no-referrer');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  headers.set('Strict-Transport-Security', 'max-age=31536000');
  // Python stays inside the user's browser. No server-side execution service.
  headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net 'wasm-unsafe-eval'; worker-src 'self' blob:; connect-src 'self' https://cdn.jsdelivr.net; img-src 'self' data: https://vietqr.app; style-src 'self' 'unsafe-inline'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  return new Response(response.body, { status: response.status, headers });
}
function configured(env) {
  try {
    return new URL(env.APP_ORIGIN).origin === env.APP_ORIGIN
      && new URL(env.APP_ORIGIN).protocol === 'https:'
      && /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(env.SUPABASE_URL)
      && Boolean(env.SUPABASE_ANON_KEY && env.SUPABASE_SERVICE_ROLE_KEY);
  } catch { return false; }
}
function paymentsConfigured(env) {
  return configured(env) && env.PAYMENTS_ENABLED === 'true' && env.BANK_CODE === 'MB'
    && /^[a-z0-9]{1,19}$/i.test(env.BANK_ACCOUNT || '')
    && Boolean(env.BANK_ACCOUNT_NAME?.trim()) && env.SEPAY_WEBHOOK_SECRET?.length >= 32
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.SUPPORT_EMAIL || '');
}
async function body(request, limit = 16384) {
  if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) throw new HttpError(415, 'json_required');
  if (Number(request.headers.get('Content-Length')) > limit) throw new HttpError(413, 'body_too_large');
  const reader = request.body?.getReader();
  const chunks = [];
  let length = 0;
  if (reader) while (true) {
    const item = await reader.read();
    if (item.done) break;
    length += item.value.length;
    if (length > limit) { await reader.cancel(); throw new HttpError(413, 'body_too_large'); }
    chunks.push(item.value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes;
}
function parse(bytes) {
  try { const data = JSON.parse(new TextDecoder().decode(bytes)); if (data && !Array.isArray(data) && typeof data === 'object') return data; } catch { /* handled below */ }
  throw new HttpError(400, 'invalid_json');
}
export async function verifyWebhook(request, bytes, secret, now = Date.now()) {
  const timestamp = request.headers.get('X-SePay-Timestamp') || '';
  const signature = request.headers.get('X-SePay-Signature') || '';
  if (!secret || secret.length < 32 || !/^\d{10}$/.test(timestamp) || !/^sha256=[a-f0-9]{64}$/i.test(signature)) return false;
  if (Math.abs(now / 1000 - Number(timestamp)) > 300) return false;
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const prefix = encoder.encode(`${timestamp}.`);
  const message = new Uint8Array(prefix.length + bytes.length);
  message.set(prefix); message.set(bytes, prefix.length);
  const expected = Uint8Array.from(signature.slice(7).match(/../g), x => Number.parseInt(x, 16));
  return crypto.subtle.verify('HMAC', key, expected, message);
}
export function paymentCode(data) {
  const contentCodes = [...String(data.content || '').toUpperCase().matchAll(/\bIT1140[A-F0-9]{16}\b/g)].map(m => m[0]);
  const explicit = typeof data.code === 'string' ? data.code.toUpperCase() : '';
  if (/^IT1140[A-F0-9]{16}$/.test(explicit)) contentCodes.push(explicit);
  const codes = [...new Set(contentCodes)];
  return codes.length === 1 ? codes[0] : null;
}
export function bankTime(value) {
  // SePay transactionDate uses the bank's local Vietnam time, not UTC.
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(value.replace(' ', 'T') + '+07:00');
  if (!Number.isFinite(date.getTime())) return null;
  const local = new Date(date.getTime() + 7 * 3600000).toISOString().slice(0, 19).replace('T', ' ');
  return local === value ? date.toISOString() : null;
}
function publicOrder(order, env) {
  const qr = new URL('https://vietqr.app/img');
  for (const [key, value] of Object.entries({ bank: 'MB', acc: order.account_number, amount: order.amount,
    des: order.transfer_code, holder: env.BANK_ACCOUNT_NAME, template: 'compact', showinfo: 'true', fullacc: 'true' })) qr.searchParams.set(key, String(value));
  return { id: order.id, amount: order.amount, currency: 'VND', status: order.status,
    code: order.transfer_code, expiresAt: order.expires_at, paidAt: order.paid_at,
    bank: 'MB', account: order.account_number, accountName: env.BANK_ACCOUNT_NAME, qrUrl: qr.href };
}

export function createApp({ fetcher = fetch, now = () => Date.now() } = {}) {
  async function upstream(env, path, { admin = true, token, method = 'GET', data } = {}) {
    const key = admin ? env.SUPABASE_SERVICE_ROLE_KEY : env.SUPABASE_ANON_KEY;
    let response;
    try {
      response = await fetcher(env.SUPABASE_URL + path, { method, headers: {
        apikey: key, Authorization: `Bearer ${token || key}`, 'Content-Type': 'application/json',
      }, body: data === undefined ? undefined : JSON.stringify(data), signal: AbortSignal.timeout(10000) });
    } catch { throw new HttpError(503, 'service_unavailable'); }
    if (!response.ok) {
      // Do not return upstream errors, tokens, database details or banking secrets.
      if (response.status === 401 || response.status === 403) throw new HttpError(401, 'unauthenticated');
      throw new HttpError(503, 'service_unavailable');
    }
    if (response.status === 204) return null;
    return response.json();
  }
  const rpc = (env, name, data) => upstream(env, `/rest/v1/rpc/${name}`, { method: 'POST', data });
  async function limit(env, key, count, seconds) {
    if (!await rpc(env, 'commerce_rate_limit', { p_key: key, p_limit: count, p_seconds: seconds })) throw new HttpError(429, 'rate_limited');
  }
  async function user(request, env) {
    const token = cookies(request).get(ACCESS);
    if (!token || token.length > 8192) throw new HttpError(401, 'unauthenticated');
    const account = await upstream(env, '/auth/v1/user', { admin: false, token });
    if (!uuidPattern.test(account?.id || '') || !account.email_confirmed_at) throw new HttpError(403, 'verify_email');
    return account;
  }
  async function entitled(account, env) {
    const rows = await upstream(env, `/rest/v1/commerce_entitlements?user_id=eq.${account.id}&product_id=eq.${PRODUCT}&select=expires_at,revoked_at`);
    return rows.some(row => !row.revoked_at && (!row.expires_at || Date.parse(row.expires_at) > now()));
  }
  function sessionResponse(session) {
    if (!session.access_token || !session.refresh_token || !uuidPattern.test(session.user?.id || '') || !session.user.email_confirmed_at) throw new HttpError(403, 'verify_email');
    const response = json({ success: true });
    response.headers.append('Set-Cookie', cookie(ACCESS, session.access_token, Math.min(3600, Number(session.expires_in) || 3600)));
    response.headers.append('Set-Cookie', cookie(REFRESH, session.refresh_token, 7 * 86400));
    return response;
  }
  async function handle(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (path === '/api/config' && request.method === 'GET') {
      let price = 20000;
      if (configured(env)) {
        const products = await upstream(env, `/rest/v1/commerce_products?id=eq.${PRODUCT}&select=amount,active`);
        if (!products[0]?.active) return json({ ready: true, paymentsEnabled: false, price, lifetime: true });
        price = products[0].amount;
      }
      return json({ ready: configured(env), paymentsEnabled: paymentsConfigured(env), price, lifetime: true,
        supportEmail: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.SUPPORT_EMAIL || '') ? env.SUPPORT_EMAIL : '' });
    }
    if (path.startsWith('/api/')) {
      if (!configured(env)) throw new HttpError(503, 'not_configured');
      if (url.origin !== env.APP_ORIGIN) throw new HttpError(403, 'wrong_origin');
      if (request.method !== 'GET' && path !== '/api/webhooks/sepay') {
        if (request.headers.get('Origin') !== env.APP_ORIGIN) throw new HttpError(403, 'wrong_origin');
      }
      if (path === '/api/webhooks/sepay' && request.method === 'POST') {
        if (!env.SEPAY_WEBHOOK_SECRET || !env.BANK_ACCOUNT) throw new HttpError(503, 'not_configured');
        const raw = await body(request, 65536);
        if (!await verifyWebhook(request, raw, env.SEPAY_WEBHOOK_SECRET, now())) throw new HttpError(401, 'invalid_signature');
        const data = parse(raw);
        if (!Number.isSafeInteger(data.id) || data.id <= 0 || !Number.isSafeInteger(data.transferAmount) || data.transferAmount <= 0) throw new HttpError(400, 'invalid_transaction');
        if (data.transferType !== 'in') return json({ success: true });
        const account = String(data.accountNumber || '');
        const gateway = String(data.gateway || '').toLowerCase().replace(/\s/g, '');
        const result = await rpc(env, 'commerce_receive_payment', {
          p_transaction_id: String(data.id), p_hash: await digest(new TextDecoder().decode(raw)),
          p_code: paymentCode(data), p_amount: data.transferAmount, p_account: account,
          p_bank_time: bankTime(data.transactionDate),
          p_valid_receiver: env.BANK_CODE === 'MB' && ['mb','mbbank'].includes(gateway) && account === env.BANK_ACCOUNT,
        });
        if (result.outcome === 'review') console.warn('payment_review', String(data.id), result.reason);
        return json({ success: true });
      }
      if (['/api/auth/login', '/api/auth/signup'].includes(path) && request.method === 'POST') {
        const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
        const ipKey = await digest(`login:${env.SUPABASE_SERVICE_ROLE_KEY}:${ip}`);
        await limit(env, `auth:${ipKey}`, 10, 600);
        const data = parse(await body(request));
        if (typeof data.email !== 'string' || data.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)
          || typeof data.password !== 'string' || data.password.length < 12 || data.password.length > 128) throw new HttpError(400, 'invalid_credentials');
        const credentials = { email: data.email.trim(), password: data.password };
        if (path.endsWith('signup')) {
          await upstream(env, `/auth/v1/signup?redirect_to=${encodeURIComponent(env.APP_ORIGIN + '/')}`, { admin: false, method: 'POST', data: credentials });
          return json({ success: true, message: 'Kiểm tra email để xác nhận tài khoản, sau đó đăng nhập.' });
        }
        try { return sessionResponse(await upstream(env, '/auth/v1/token?grant_type=password', { admin: false, method: 'POST', data: credentials })); }
        catch (error) { if (error.status === 503 || error.status === 401) throw new HttpError(401, 'invalid_login'); throw error; }
      }
      if (path === '/api/auth/refresh' && request.method === 'POST') {
        const token = cookies(request).get(REFRESH);
        if (!token || token.length > 8192) throw new HttpError(401, 'unauthenticated');
        await limit(env, 'refresh:' + await digest(token), 10, 60);
        return sessionResponse(await upstream(env, '/auth/v1/token?grant_type=refresh_token', { admin: false, method: 'POST', data: { refresh_token: token } }));
      }
      if (path === '/api/auth/logout' && request.method === 'POST') {
        const token = cookies(request).get(ACCESS);
        if (token) await upstream(env, '/auth/v1/logout?scope=local', { admin: false, token, method: 'POST' }).catch(() => {});
        const response = json({ success: true });
        response.headers.append('Set-Cookie', cookie(ACCESS, '', 0));
        response.headers.append('Set-Cookie', cookie(REFRESH, '', 0));
        return response;
      }
      const account = await user(request, env);
      if (path === '/api/me' && request.method === 'GET') return json({ id: account.id, email: account.email, lifetime: await entitled(account, env) });
      if (path === '/api/orders' && request.method === 'POST') {
        if (!paymentsConfigured(env)) throw new HttpError(503, 'sales_disabled');
        if (await entitled(account, env)) throw new HttpError(409, 'already_owned');
        await limit(env, `order:${account.id}`, 5, 3600);
        // No client-supplied price, beneficiary, user ID or product ID is read.
        const code = 'IT1140' + crypto.randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase();
        const result = await rpc(env, 'commerce_create_order', { p_user_id: account.id, p_code: code, p_account: env.BANK_ACCOUNT });
        return json(publicOrder(Array.isArray(result) ? result[0] : result, env), 201);
      }
      if (path.startsWith('/api/orders/') && request.method === 'GET') {
        const id = path.slice('/api/orders/'.length);
        if (!uuidPattern.test(id)) throw new HttpError(404, 'not_found');
        await limit(env, `order-read:${account.id}`, 120, 600);
        const rows = await upstream(env, `/rest/v1/commerce_orders?id=eq.${id}&user_id=eq.${account.id}&select=*`);
        if (!rows[0]) throw new HttpError(404, 'not_found');
        const reviews = await upstream(env, `/rest/v1/commerce_payments?order_id=eq.${id}&outcome=eq.review&select=reason&limit=1`);
        return json({ ...publicOrder(rows[0], env), needsReview: reviews.length > 0 });
      }
      if (path.startsWith('/api/course/') && request.method === 'GET') {
        if (!await entitled(account, env)) throw new HttpError(403, 'purchase_required');
        await limit(env, `course:${account.id}`, 40, 3600);
        if (path === '/api/course/manifest') return json({ version: 11, userScope: account.id, subjects: [{ id: 'it1140', file: '/api/course/bank' }] });
        if (path === '/api/course/bank') return json(bank);
        if (path === '/api/course/python') return json({ ...exercises, userScope: account.id });
      }
      throw new HttpError(404, 'not_found');
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') throw new HttpError(405, 'method_not_allowed');
    if (path === '/learn' || path === '/learn.html') {
      if (!configured(env)) return Response.redirect(url.origin + '/', 303);
      try {
        const account = await user(request, env);
        if (!await entitled(account, env)) return Response.redirect(url.origin + '/', 303);
      } catch (error) { if (error.status === 401 || error.status === 403) return Response.redirect(url.origin + '/', 303); throw error; }
      return env.ASSETS.fetch(new Request(url.origin + '/learn.html', request));
    }
    // Exact allowlist. There is deliberately no /data, source, SQL or env serving.
    if (path === '/' || path === '/index.html') return env.ASSETS.fetch(new Request(url.origin + '/index.html', request));
    if (['/account.js','/account.css','/commerce-sw.js','/commerce-access.js'].includes(path) || /^\/assets\/(css|js)\/[a-z0-9-]+\.(css|js)$/.test(path)) return env.ASSETS.fetch(request);
    throw new HttpError(404, 'not_found');
  }
  return { async fetch(request, env) {
    try { return secure(await handle(request, env)); }
    catch (error) {
      const status = error instanceof HttpError ? error.status : 503;
      if (!(error instanceof HttpError)) console.error('commerce_unexpected_error');
      return secure(json({ error: error instanceof HttpError ? error.message : 'service_unavailable' }, status));
    }
  } };
}
// Retained only for prototype regression tests and shared payment parsing.
// Never accidentally deploy the old whole-bank API after selecting the VM design.
export default { fetch() { return new Response('Prototype retired. Deploy commerce/vm instead.', { status: 503, headers: { 'Cache-Control': 'no-store' } }); } };
