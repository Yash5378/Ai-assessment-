/**
 * Minimal fetch wrapper. Normalizes errors into Error objects carrying the
 * HTTP status and any field-level validation details from the backend.
 * A 401 anywhere except the auth endpoints means the session expired
 * mid-use — the user is sent back to the login page.
 */

// 401 is an expected outcome on these paths (bad credentials, anonymous
// session probe), so it must not trigger the expiry redirect.
const AUTH_PATHS = ['/auth/login', '/auth/me', '/auth/logout'];

function handleExpiredSession(path, status) {
  if (status === 401 && !AUTH_PATHS.includes(path) && window.location.pathname !== '/login') {
    window.location.assign('/login');
  }
}

async function parseAndThrow(path, response) {
  let data = null;
  try {
    data = await response.json();
  } catch {
    // Non-JSON response (e.g. gateway error) — handled below via status.
  }

  if (!response.ok) {
    handleExpiredSession(path, response.status);
    const error = new Error(data?.error || `Request failed (${response.status})`);
    error.status = response.status;
    error.details = data?.details;
    throw error;
  }
  return data;
}

async function request(path, options = {}) {
  const { body, ...rest } = options;

  const response = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    ...rest,
  });
  return parseAndThrow(path, response);
}

/**
 * Multipart upload (e.g. resume). The browser sets the multipart boundary
 * itself, so we must NOT set a Content-Type header here.
 */
async function upload(path, formData) {
  const response = await fetch(`/api${path}`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  return parseAndThrow(path, response);
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  delete: (path) => request(path, { method: 'DELETE' }),
  upload,
};
