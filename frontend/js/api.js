function _headers(auth) {
  const h = { 'Content-Type': 'application/json' };
  const t = getToken();
  if (t) h['Authorization'] = `Bearer ${t}`;
  return h;
}

const RENDER_API_WARMUP_ENABLED = /\.onrender\.com\/api$/i.test(BASE_URL);
let _apiWarm = false;
let _apiWarmupPromise = null;

function _sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function _ensureApiReady() {
  if (!RENDER_API_WARMUP_ENABLED || _apiWarm) return;
  if (_apiWarmupPromise) return _apiWarmupPromise;

  _apiWarmupPromise = (async () => {
    for (let attempt = 0; attempt < 7; attempt += 1) {
      try {
        const res = await fetch(`${BASE_URL}/health`, {
          method: 'GET',
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
        if (res.ok) {
          _apiWarm = true;
          return;
        }
      } catch {}

      if (attempt < 6) await _sleep(10000);
    }

    throw new Error('The Render backend is still waking up. Please wait about a minute and try again.');
  })();

  try {
    await _apiWarmupPromise;
  } finally {
    if (!_apiWarm) _apiWarmupPromise = null;
  }
}

async function _request(endpoint, options) {
  try {
    await _ensureApiReady();
    const res = await fetch(`${BASE_URL}${endpoint}`, options);
    return _handle(res);
  } catch (err) {
    const msg = String(err?.message || '');
    const isFetchNetworkError = err?.name === 'TypeError' || /failed to fetch|networkerror|load failed/i.test(msg);
    if (isFetchNetworkError) {
      throw new Error('Could not reach the server. Check the API URL and make sure the backend is running.');
    }
    throw new Error(msg || 'Could not reach the server. Check the API URL and make sure the backend is running.');
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
