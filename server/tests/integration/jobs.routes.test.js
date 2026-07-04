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

const validJob = {
  title: 'Backend Engineer',
  description: 'Design and build our REST APIs with Node.js.',
  location: 'Remote',
  employmentType: 'FULL_TIME',
};

describe('POST /api/jobs (role enforcement)', () => {
  it('rejects unauthenticated requests with 401', async () => {
    const response = await request(app).post('/api/jobs').send(validJob);
    expect(response.status).toBe(401);
    expect(db.query).not.toHaveBeenCalled();
  });

  it('forbids candidates from posting jobs (403)', async () => {
    const response = await request(app).post('/api/jobs').set('Cookie', asCandidate).send(validJob);
    expect(response.status).toBe(403);
    expect(db.query).not.toHaveBeenCalled();
  });

  it('lets HR create a job', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 10 }] }) // INSERT
      .mockResolvedValueOnce({ rows: [{ id: 10, ...validJob, status: 'OPEN', createdBy: 1 }] });

    const response = await request(app).post('/api/jobs').set('Cookie', asHr).send(validJob);
    expect(response.status).toBe(201);
    expect(response.body.job.id).toBe(10);
  });

  it('rejects an invalid payload with field details', async () => {
    const response = await request(app)
      .post('/api/jobs')
      .set('Cookie', asHr)
      .send({ ...validJob, employmentType: 'GIG', title: 'ab' });

    expect(response.status).toBe(400);
    const fields = response.body.details.map((d) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['title', 'employmentType']));
  });
});

describe('GET /api/jobs/:id (param validation)', () => {
  it('returns 400 for a non-numeric id instead of hitting the DB', async () => {
    const response = await request(app).get('/api/jobs/abc').set('Cookie', asCandidate);
    expect(response.status).toBe(400);
    expect(db.query).not.toHaveBeenCalled();
  });

  it('returns 404 for a missing job', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });
    const response = await request(app).get('/api/jobs/999').set('Cookie', asCandidate);
    expect(response.status).toBe(404);
  });
});

describe('POST /api/jobs/:id/applications (apply edge cases)', () => {
  const coverLetter = { coverLetter: 'I am a strong fit for this role because of my experience.' };

  it('forbids HR from applying to jobs', async () => {
    const response = await request(app)
      .post('/api/jobs/10/applications')
      .set('Cookie', asHr)
      .send(coverLetter);
    expect(response.status).toBe(403);
  });

  it('returns 400 when the job is closed', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ status: 'CLOSED' }] });
    const response = await request(app)
      .post('/api/jobs/10/applications')
      .set('Cookie', asCandidate)
      .send(coverLetter);
    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/no longer accepting/i);
  });

  it('returns 409 for a duplicate application (unique constraint)', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ status: 'OPEN' }] })
      .mockRejectedValueOnce(Object.assign(new Error('duplicate'), { code: '23505' }));

    const response = await request(app)
      .post('/api/jobs/10/applications')
      .set('Cookie', asCandidate)
      .send(coverLetter);
    expect(response.status).toBe(409);
    expect(response.body.error).toMatch(/already applied/i);
  });
});

describe('PATCH /api/jobs/:id (ownership)', () => {
  it("forbids HR from editing another HR user's job", async () => {
    db.query.mockResolvedValueOnce({ rows: [{ created_by: 99 }] }); // owned by someone else
    const response = await request(app)
      .patch('/api/jobs/10')
      .set('Cookie', asHr)
      .send({ status: 'CLOSED' });
    expect(response.status).toBe(403);
  });
});
