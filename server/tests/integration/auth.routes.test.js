const request = require('supertest');

jest.mock('../../src/db/pool', () => ({
  query: jest.fn(),
  pool: { query: jest.fn() },
}));

const db = require('../../src/db/pool');
const createApp = require('../../src/app');
const { hashPassword } = require('../../src/utils/password');

const app = createApp();

describe('POST /api/auth/register', () => {
  it('creates a candidate account and sets an httpOnly auth cookie', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [] }) // email lookup: no existing user
      .mockResolvedValueOnce({
        rows: [{ id: 1, name: 'Jane Doe', email: 'jane@example.com', role: 'CANDIDATE' }],
      });

    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Jane Doe', email: 'jane@example.com', password: 'Passw0rd' });

    expect(response.status).toBe(201);
    expect(response.body.user).toMatchObject({ email: 'jane@example.com', role: 'CANDIDATE' });
    expect(response.body.user.password_hash).toBeUndefined();

    const cookie = response.headers['set-cookie']?.[0] ?? '';
    expect(cookie).toContain('token=');
    expect(cookie).toContain('HttpOnly');
  });

  it('returns 409 for a duplicate email', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // email already taken

    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Jane Doe', email: 'jane@example.com', password: 'Passw0rd' });

    expect(response.status).toBe(409);
    expect(response.body.error).toMatch(/already exists/i);
  });

  it('returns 400 with field details for a weak password', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Jane Doe', email: 'jane@example.com', password: 'weak' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation failed');
    expect(response.body.details.some((d) => d.field === 'password')).toBe(true);
    expect(db.query).not.toHaveBeenCalled(); // rejected before touching the DB
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with correct credentials', async () => {
    const passwordHash = await hashPassword('Admin@1234');
    db.query.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          name: 'HR Admin',
          email: 'admin@test.com',
          role: 'HR',
          password_hash: passwordHash,
        },
      ],
    });

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'Admin@1234' });

    expect(response.status).toBe(200);
    expect(response.body.user.role).toBe('HR');
    expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
  });

  it('returns the same generic 401 for wrong password and unknown email', async () => {
    const passwordHash = await hashPassword('Admin@1234');
    db.query.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          name: 'HR Admin',
          email: 'admin@test.com',
          role: 'HR',
          password_hash: passwordHash,
        },
      ],
    });
    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'WrongPass1' });

    db.query.mockResolvedValueOnce({ rows: [] });
    const unknownEmail = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ghost@test.com', password: 'Whatever1' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.error).toBe(unknownEmail.body.error); // no user enumeration
  });
});

describe('GET /api/auth/me', () => {
  it('returns 401 without a session cookie', async () => {
    const response = await request(app).get('/api/auth/me');
    expect(response.status).toBe(401);
  });
});
