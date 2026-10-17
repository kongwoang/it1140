(function () {
  // Only authenticated cookies are sent; no access token is stored in JS/storage.
  const originalFetch = window.fetch.bind(window);
  let refresh;
  window.fetch = async function (input, options) {
    const url = new URL(input instanceof Request ? input.url : input, location.href);
    const response = await originalFetch(input, options);
    if (url.origin !== location.origin || !url.pathname.startsWith('/api/course/')) return response;
    if (response.status === 403) { location.replace('/'); return response; }
    if (response.status !== 401) return response;
    if (!refresh) refresh = originalFetch('/api/auth/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' } }).finally(() => { refresh = null; });
    const renewed = await refresh;
    if (!renewed.ok) { location.replace('/'); return response; }
    return originalFetch(input, options);
  };
})();
