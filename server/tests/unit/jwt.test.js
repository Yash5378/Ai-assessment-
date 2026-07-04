const { signToken, verifyToken } = require('../../src/utils/jwt');

describe('jwt utils', () => {
  const user = { id: 42, role: 'CANDIDATE' };

  it('round-trips id and role through sign/verify', () => {
    const payload = verifyToken(signToken(user));
    expect(payload.sub).toBe(42);
    expect(payload.role).toBe('CANDIDATE');
  });

  it('returns null for a tampered token', () => {
    const token = signToken(user);
    expect(verifyToken(`${token}x`)).toBeNull();
  });

  it('returns null for garbage input', () => {
    expect(verifyToken('not-a-token')).toBeNull();
    expect(verifyToken('')).toBeNull();
  });

  it('does not embed personal data in the token', () => {
    const token = signToken({ id: 1, role: 'HR', email: 'admin@test.com', name: 'HR Admin' });
    const payload = verifyToken(token);
    expect(payload.email).toBeUndefined();
    expect(payload.name).toBeUndefined();
  });
});
