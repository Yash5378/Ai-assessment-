const request = require('supertest');

jest.mock('../../src/db/pool', () => ({
  query: jest.fn(),
  pool: { query: jest.fn() },
}));

const db = require('../../src/db/pool');
const createApp = require('../../src/app');
const { signToken } = require('../../src/utils/jwt');

const app = createApp();
const asCandidate = `token=${signToken({ id: 2, role: 'CANDIDATE' })}`;

describe('CSRF origin verification', () => {
  it('blocks a state-changing request from a foreign origin (403)', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .set('Origin', 'https://evil.example.com')
      .send({ email: 'admin@test.com', password: 'Admin@1234' });

    expect(response.status).toBe(403);
    expect(response.body.error).toMatch(/cross-origin/i);
    expect(db.query).not.toHaveBeenCalled();
  });

  it('allows the app origin', async () => {
    db.query.mockResolvedValueOnce({ rows: [] }); // unknown email -> 401 (not 403)
    const response = await request(app)
      .post('/api/auth/login')
      .set('Origin', 'http://localhost:3000')
      .send({ email: 'ghost@test.com', password: 'Whatever1' });

    expect(response.status).toBe(401);
  });

  it('allows requests without an Origin header (curl, tests)', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ghost@test.com', password: 'Whatever1' });

    expect(response.status).toBe(401);
  });

  it('never blocks safe methods regardless of origin', async () => {
    const response = await request(app)
      .get('/api/health')
      .set('Origin', 'https://evil.example.com');
    expect(response.status).toBe(200);
  });
});

describe('resume magic-byte verification', () => {
  const fields = (req) =>
    req
      .field('phone', '+91 98765 43210')
      .field('currentCity', 'Mumbai')
      .field('employmentStatus', 'EXPERIENCED');

  it('rejects a fake PDF whose bytes are not a PDF (400) and does not touch the DB', async () => {
    const response = await fields(
      request(app).post('/api/profile/onboarding').set('Cookie', asCandidate)
    ).attach('resume', Buffer.from('this is just text pretending'), {
      filename: 'resume.pdf',
      contentType: 'application/pdf',
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/content does not match/i);
    expect(db.query).not.toHaveBeenCalled();
  });

  it('accepts a file with a real PDF signature', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ userId: 2, onboarded: true }] });

    const response = await fields(
      request(app).post('/api/profile/onboarding').set('Cookie', asCandidate)
    ).attach('resume', Buffer.from('%PDF-1.4 real enough'), {
      filename: 'resume.pdf',
      contentType: 'application/pdf',
    });

    expect(response.status).toBe(201);
  });

  it('accepts a DOCX with a ZIP signature', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ userId: 2, onboarded: true }] });

    const response = await fields(
      request(app).post('/api/profile/onboarding').set('Cookie', asCandidate)
    ).attach('resume', Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]), {
      filename: 'resume.docx',
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    expect(response.status).toBe(201);
  });
});
