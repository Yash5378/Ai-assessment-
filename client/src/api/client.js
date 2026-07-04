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

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
};
