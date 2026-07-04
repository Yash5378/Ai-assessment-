/**
 * Minimal fetch wrapper. Normalizes errors into Error objects carrying the
 * HTTP status and any field-level validation details from the backend.
 */
async function request(path, options = {}) {
  const { body, ...rest } = options;

  const response = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    ...rest,
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    // Non-JSON response (e.g. gateway error) — handled below via status.
  }

  if (!response.ok) {
    const error = new Error(data?.error || `Request failed (${response.status})`);
    error.status = response.status;
    error.details = data?.details;
    throw error;
  }

  return data;
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

  let data = null;
  try {
    data = await response.json();
  } catch {
    // Non-JSON response — handled via status below.
  }

  if (!response.ok) {
    const error = new Error(data?.error || `Request failed (${response.status})`);
    error.status = response.status;
    error.details = data?.details;
    throw error;
  }
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  upload,
};
