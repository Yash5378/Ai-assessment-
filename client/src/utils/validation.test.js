import { describe, it, expect } from 'vitest';
import {
  validateName,
  validateEmail,
  validatePassword,
  validateLength,
  validatePhone,
  validateResumeFile,
  collectErrors,
} from './validation';

describe('validateEmail', () => {
  it('accepts a normal email', () => {
    expect(validateEmail('jane@example.com')).toBe('');
  });

  it.each(['', 'plainstring', 'missing@tld', '@nouser.com'])('rejects %p', (value) => {
    expect(validateEmail(value)).not.toBe('');
  });
});

describe('validatePassword', () => {
  it('accepts a policy-compliant password', () => {
    expect(validatePassword('Passw0rd')).toBe('');
  });

  it.each([
    ['too short', 'Pw1'],
    ['no uppercase', 'password1'],
    ['no lowercase', 'PASSWORD1'],
    ['no number', 'Password'],
  ])('rejects %s', (_label, value) => {
    expect(validatePassword(value)).not.toBe('');
  });
});

describe('validateName / validateLength', () => {
  it('rejects a blank name', () => {
    expect(validateName('   ')).not.toBe('');
  });

  it('enforces min and max lengths', () => {
    expect(validateLength('short', 'Cover letter', 20, 3000)).toMatch(/at least 20/);
    expect(validateLength('x'.repeat(30), 'Cover letter', 20, 3000)).toBe('');
  });
});

describe('validatePhone', () => {
  it('accepts a valid phone', () => {
    expect(validatePhone('+91 98765 43210')).toBe('');
  });

  it.each(['abc', '12', ''])('rejects %p', (value) => {
    expect(validatePhone(value)).not.toBe('');
  });

  it('is optional when required=false', () => {
    expect(validatePhone('', { required: false })).toBe('');
  });
});

describe('validateResumeFile', () => {
  const makeFile = (name, size) => ({ name, size });

  it('accepts a small PDF', () => {
    expect(validateResumeFile(makeFile('cv.pdf', 1024))).toBe('');
  });

  it('rejects an unsupported extension', () => {
    expect(validateResumeFile(makeFile('cv.txt', 1024))).toMatch(/PDF, DOC or DOCX/);
  });

  it('rejects a file over 5 MB', () => {
    expect(validateResumeFile(makeFile('cv.pdf', 6 * 1024 * 1024))).toMatch(/5 MB/);
  });

  it('requires a file by default', () => {
    expect(validateResumeFile(null)).not.toBe('');
    expect(validateResumeFile(null, { required: false })).toBe('');
  });
});

describe('collectErrors', () => {
  it('returns only failing fields', () => {
    const errors = collectErrors({
      email: () => validateEmail('bad'),
      password: () => validatePassword('Passw0rd'),
    });
    expect(Object.keys(errors)).toEqual(['email']);
  });
});
