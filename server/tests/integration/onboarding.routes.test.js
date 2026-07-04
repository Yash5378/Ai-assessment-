const request = require('supertest');

jest.mock('../../src/db/pool', () => ({
  query: jest.fn(),
  pool: { query: jest.fn() },
}));

const db = require('../../src/db/pool');
const createApp = require('../../src/app');
const { signToken } = require('../../src/utils/jwt');

const app = createApp();

const asHr = `token=${signToken({ id: 1, role: 'HR' })}`;
const asCandidate = `token=${signToken({ id: 2, role: 'CANDIDATE' })}`;

const PDF_BYTES = Buffer.from('%PDF-1.4 fake resume for tests');

describe('POST /api/profile/onboarding', () => {
  it('rejects onboarding without a resume file (400)', async () => {
    const response = await request(app)
      .post('/api/profile/onboarding')
      .set('Cookie', asCandidate)
      .field('phone', '+91 98765 43210')
      .field('currentCity', 'Mumbai')
      .field('employmentStatus', 'EXPERIENCED');

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/resume/i);
  });

  it('forbids HR from completing candidate onboarding (403)', async () => {
    const response = await request(app)
      .post('/api/profile/onboarding')
      .set('Cookie', asHr)
      .field('phone', '+91 98765 43210')
      .field('currentCity', 'Mumbai')
      .field('employmentStatus', 'EXPERIENCED')
      .attach('resume', PDF_BYTES, { filename: 'resume.pdf', contentType: 'application/pdf' });

    expect(response.status).toBe(403);
  });

  it('rejects a non-pdf/doc resume (400)', async () => {
    const response = await request(app)
      .post('/api/profile/onboarding')
      .set('Cookie', asCandidate)
      .field('phone', '+91 98765 43210')
      .field('currentCity', 'Mumbai')
      .field('employmentStatus', 'EXPERIENCED')
      .attach('resume', Buffer.from('nope'), { filename: 'resume.txt', contentType: 'text/plain' });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/PDF, DOC or DOCX/i);
  });

  it('rejects an invalid phone even with a valid file (400)', async () => {
    const response = await request(app)
      .post('/api/profile/onboarding')
      .set('Cookie', asCandidate)
      .field('phone', 'abc')
      .field('currentCity', 'Mumbai')
      .field('employmentStatus', 'EXPERIENCED')
      .attach('resume', PDF_BYTES, { filename: 'resume.pdf', contentType: 'application/pdf' });

    expect(response.status).toBe(400);
    expect(response.body.details.some((d) => d.field === 'phone')).toBe(true);
  });

  it('completes onboarding and flips onboarded to true', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ userId: 2, phone: '+91 98765 43210', onboarded: true }],
    });

    const response = await request(app)
      .post('/api/profile/onboarding')
      .set('Cookie', asCandidate)
      .field('phone', '+91 98765 43210')
      .field('currentCity', 'Mumbai')
      .field('employmentStatus', 'EXPERIENCED')
      .attach('resume', PDF_BYTES, { filename: 'resume.pdf', contentType: 'application/pdf' });

    expect(response.status).toBe(201);
    expect(response.body.profile.onboarded).toBe(true);

    // The stored filename is server-generated, not the client-supplied name.
    const [, values] = db.query.mock.calls[0];
    expect(values).toContain('+91 98765 43210');
    expect(values.some((v) => typeof v === 'string' && v.startsWith('candidate-2-'))).toBe(true);
  });
});

describe('resume download authorization', () => {
  it('lets HR request a candidate resume but 404s when none exists', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ filename: null, originalName: null }] });
    const response = await request(app).get('/api/candidates/2/resume').set('Cookie', asHr);
    expect(response.status).toBe(404);
  });

  it('forbids a candidate from using the HR resume-download route (403)', async () => {
    const response = await request(app).get('/api/candidates/3/resume').set('Cookie', asCandidate);
    expect(response.status).toBe(403);
    expect(db.query).not.toHaveBeenCalled();
  });

  it('requires authentication to download own resume (401)', async () => {
    const response = await request(app).get('/api/profile/resume');
    expect(response.status).toBe(401);
  });
});
