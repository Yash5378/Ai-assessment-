const { requireAuth, requireRole } = require('../../src/middleware/auth');
const { signToken } = require('../../src/utils/jwt');

const runMiddleware = (middleware, req) => {
  const next = jest.fn();
  middleware(req, {}, next);
  return next;
};

describe('requireAuth', () => {
  it('rejects a request without a token cookie', () => {
    const next = runMiddleware(requireAuth, { cookies: {} });
    expect(next.mock.calls[0][0].statusCode).toBe(401);
  });

  it('rejects an invalid token', () => {
    const next = runMiddleware(requireAuth, { cookies: { token: 'garbage' } });
    expect(next.mock.calls[0][0].statusCode).toBe(401);
  });

  it('attaches id and role for a valid token', () => {
    const req = { cookies: { token: signToken({ id: 7, role: 'HR' }) } };
    const next = runMiddleware(requireAuth, req);
    expect(next).toHaveBeenCalledWith(); // no error
    expect(req.user).toEqual({ id: 7, role: 'HR' });
  });
});

describe('requireRole', () => {
  it('rejects when no user is attached (missing requireAuth)', () => {
    const next = runMiddleware(requireRole('HR'), {});
    expect(next.mock.calls[0][0].statusCode).toBe(401);
  });

  it('rejects the wrong role with 403', () => {
    const next = runMiddleware(requireRole('HR'), { user: { id: 1, role: 'CANDIDATE' } });
    expect(next.mock.calls[0][0].statusCode).toBe(403);
  });

  it('allows a matching role', () => {
    const next = runMiddleware(requireRole('HR'), { user: { id: 1, role: 'HR' } });
    expect(next).toHaveBeenCalledWith();
  });
});
