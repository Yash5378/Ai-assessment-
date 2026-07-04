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
 * Optional whole number within [min, max]. Empty input is valid unless
 * required is set.
 */
export function validateNumber(value, label, { min = 0, max = 50, required = false } = {}) {
  const text = String(value ?? '').trim();
  if (!text) return required ? `${label} is required` : '';
  const number = Number(text);
  if (!Number.isInteger(number)) return `${label} must be a whole number`;
  if (number < min) return `${label} cannot be less than ${min}`;
  if (number > max) return `${label} cannot be more than ${max}`;
  return '';
}

/**
 * Comma-separated skills ("react, node.js") — at least one when required,
 * each at most 30 characters.
 */
export function validateSkills(value, { required = true } = {}) {
  const skills = value.split(',').map((skill) => skill.trim()).filter(Boolean);
  if (skills.length === 0) return required ? 'Add at least one skill (comma-separated)' : '';
  if (skills.length > 15) return 'At most 15 skills allowed';
  const tooLong = skills.find((skill) => skill.length > 30);
  if (tooLong) return `"${tooLong}" is too long (max 30 characters)`;
  return '';
}

export const parseSkills = (value) =>
  [...new Set(value.split(',').map((skill) => skill.trim().toLowerCase()).filter(Boolean))];

const PHONE_PATTERN = /^[+\d][\d\s-]{6,14}$/;

export function validatePhone(value, { required = true } = {}) {
  const phone = String(value ?? '').trim();
  if (!phone) return required ? 'Phone number is required' : '';
  if (!PHONE_PATTERN.test(phone)) return 'Please provide a valid phone number';
  return '';
}

const RESUME_EXTENSIONS = ['pdf', 'doc', 'docx'];
const MAX_RESUME_BYTES = 5 * 1024 * 1024;

/**
 * Mirrors the backend's multer constraints so the user gets feedback before
 * the upload round-trips.
 */
export function validateResumeFile(file, { required = true } = {}) {
  if (!file) return required ? 'Please attach your resume' : '';
  const extension = file.name.split('.').pop().toLowerCase();
  if (!RESUME_EXTENSIONS.includes(extension)) return 'Resume must be a PDF, DOC or DOCX file';
  if (file.size > MAX_RESUME_BYTES) return 'Resume must be at most 5 MB';
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
