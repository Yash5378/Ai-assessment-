/**
 * Client-side validation rules, mirroring the backend zod schemas
 * (server/src/validation/schemas.js). The backend remains the source of
 * truth — these exist to give users instant feedback before submitting.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateName(value) {
  const name = value.trim();
  if (!name) return 'Name is required';
  if (name.length < 2) return 'Name must be at least 2 characters';
  if (name.length > 100) return 'Name must be at most 100 characters';
  return '';
}

export function validateEmail(value) {
  const email = value.trim();
  if (!email) return 'Email is required';
  if (!EMAIL_PATTERN.test(email)) return 'Please provide a valid email address';
  if (email.length > 255) return 'Email must be at most 255 characters';
  return '';
}

export function validatePassword(value) {
  if (!value) return 'Password is required';
  if (value.length < 8) return 'Password must be at least 8 characters';
  if (value.length > 72) return 'Password must be at most 72 characters';
  if (!/[a-z]/.test(value)) return 'Password must contain a lowercase letter';
  if (!/[A-Z]/.test(value)) return 'Password must contain an uppercase letter';
  if (!/[0-9]/.test(value)) return 'Password must contain a number';
  return '';
}

export function validateRequired(value, label) {
  if (!value || !String(value).trim()) return `${label} is required`;
  return '';
}

export function validateLength(value, label, min, max) {
  const text = value.trim();
  if (text.length < min) return `${label} must be at least ${min} characters`;
  if (text.length > max) return `${label} must be at most ${max} characters`;
  return '';
}

/**
 * Runs a { field: () => message } map and returns only failing fields.
 */
export function collectErrors(checks) {
  const errors = {};
  for (const [field, check] of Object.entries(checks)) {
    const message = check();
    if (message) errors[field] = message;
  }
  return errors;
}
