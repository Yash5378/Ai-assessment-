import { describe, it, expect } from 'vitest';
import {
  validateName,
  validateEmail,
  validatePassword,
  validateLength,
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

describe('collectErrors', () => {
  it('returns only failing fields', () => {
    const errors = collectErrors({
      email: () => validateEmail('bad'),
      password: () => validatePassword('Passw0rd'),
    });
    expect(Object.keys(errors)).toEqual(['email']);
  });
});
