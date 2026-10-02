// Talks to the Express backend. Pass a FormData body for file uploads.
export async function api(path, { method = 'GET', body, auth = false } = {}) {
  const headers = {};
  if (auth) headers.Authorization = 'Bearer ' + (localStorage.getItem('ca_token') || sessionStorage.getItem('ca_token'));
  let payload = body;
  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch('/api' + path, { method, headers, body: payload });
  } catch {
    throw new Error('Cannot reach the server. Check your internet connection and try again.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || 'Request failed.');
    err.status = res.status;
    throw err;
  }
  return data;
}
