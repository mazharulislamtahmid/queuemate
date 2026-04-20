function _headers(auth) {
  const h = { 'Content-Type': 'application/json' };
  const t = getToken();
  if (t) h['Authorization'] = `Bearer ${t}`;
  return h;
}

async function _handle(res) {
  let data;
  try { data = await res.json(); } catch { data = {}; }
  if (res.status === 401) { logoutUser(); window.location.href = 'login.html'; return null; }
  if (!res.ok) throw new Error(data.message || data.error || `Error ${res.status}`);
  return data;
}

async function apiGet(endpoint, auth = false) {
  const res = await fetch(`${BASE_URL}${endpoint}`, { method:'GET', headers:_headers(auth) });
  return _handle(res);
}
async function apiPost(endpoint, data, auth = false) {
  const res = await fetch(`${BASE_URL}${endpoint}`, { method:'POST', headers:_headers(auth), body:JSON.stringify(data) });
  return _handle(res);
}
async function apiPut(endpoint, data, auth = false) {
  const res = await fetch(`${BASE_URL}${endpoint}`, { method:'PUT', headers:_headers(auth), body:JSON.stringify(data) });
  return _handle(res);
}
async function apiDelete(endpoint, auth = false) {
  const res = await fetch(`${BASE_URL}${endpoint}`, { method:'DELETE', headers:_headers(auth) });
  return _handle(res);
}
