function _headers(auth) {
  const h = { 'Content-Type': 'application/json' };
  const t = getToken();
  if (t) h['Authorization'] = `Bearer ${t}`;
  return h;
}

async function _request(endpoint, options) {
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, options);
    return _handle(res);
  } catch (err) {
    throw new Error('Could not reach the server. Check the API URL and make sure the backend is running.');
  }
}

async function _handle(res) {
  let data;
  try { data = await res.json(); } catch { data = {}; }
  if (res.status === 401) { logoutUser(); window.location.href = 'login.html'; return null; }
  if (!res.ok) throw new Error(data.message || data.error || `Error ${res.status}`);
  return data;
}

async function apiGet(endpoint, auth = false) {
  return _request(endpoint, { method:'GET', headers:_headers(auth) });
}
async function apiPost(endpoint, data, auth = false) {
  return _request(endpoint, { method:'POST', headers:_headers(auth), body:JSON.stringify(data) });
}
async function apiPut(endpoint, data, auth = false) {
  return _request(endpoint, { method:'PUT', headers:_headers(auth), body:JSON.stringify(data) });
}
async function apiDelete(endpoint, auth = false) {
  return _request(endpoint, { method:'DELETE', headers:_headers(auth) });
}
