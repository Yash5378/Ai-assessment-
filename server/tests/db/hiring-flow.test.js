/**
 * Real-database integration test: exercises the complete hiring flow against
 * an actual PostgreSQL instance (no mocks). Gated behind RUN_DB_TESTS so the
 * default `npm test` needs no database; run via `npm run test:db` (with the
 * docker-compose.test.yml overlay) or in CI's postgres service.
 */
const request = require('supertest');

const describeDb = process.env.RUN_DB_TESTS === '1' ? describe : describe.skip;

describeDb('hiring flow (real PostgreSQL)', () => {
  // Required lazily so the suite is skippable without a reachable DB.
  const { pool } = require('../../src/db/pool');
  const { migrate } = require('../../src/db/migrate');
  const createApp = require('../../src/app');

  const app = createApp();
  const runId = `dbtest-${process.hrtime.bigint()}`;
  const hrEmail = `${runId}-hr@test.local`;
  const candidateEmail = `${runId}-cand@test.local`;
  const uniqueSkill = `${runId}-skill`;

  let hrCookie;
  let candidateCookie;
  let jobId;
  let applicationId;
  let candidateId;

  const cookieOf = (response) => response.headers['set-cookie'][0].split(';')[0];

  beforeAll(async () => {
    await migrate();
  });

  afterAll(async () => {
    // Cascades to jobs, applications and profiles created by this run.
    await pool.query('DELETE FROM users WHERE email IN ($1, $2)', [hrEmail, candidateEmail]);
    await pool.end();
  });

  it('registers an HR account', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: 'DB Test HR', email: hrEmail, password: 'DbTest@123', role: 'HR' });
    expect(response.status).toBe(201);
    expect(response.body.user.role).toBe('HR');
    hrCookie = cookieOf(response);
  });

  it('HR posts a job', async () => {
    const response = await request(app).post('/api/jobs').set('Cookie', hrCookie).send({
      title: 'DB Test Engineer',
      company: 'DB Test Co',
      description: 'Integration test role touching a real database.',
      location: 'Testville',
      employmentType: 'FULL_TIME',
      skills: [uniqueSkill],
      experienceMin: 0,
    });
    expect(response.status).toBe(201);
    jobId = response.body.job.id;
    expect(response.body.job.skills).toEqual([uniqueSkill]);
  });

  it('registers a candidate who must onboard before applying', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: 'DB Test Candidate', email: candidateEmail, password: 'DbTest@123' });
    expect(response.status).toBe(201);
    expect(response.body.user.onboarded).toBe(false);
    candidateCookie = cookieOf(response);
    candidateId = response.body.user.id;
  });

  it('candidate completes onboarding with a resume', async () => {
    const response = await request(app)
      .post('/api/profile/onboarding')
      .set('Cookie', candidateCookie)
      .field('phone', '+91 98888 77777')
      .field('currentCity', 'Testville')
      .field('employmentStatus', 'FRESHER')
      .attach('resume', Buffer.from('%PDF-1.4 db test resume'), {
        filename: 'resume.pdf',
        contentType: 'application/pdf',
      });
    expect(response.status).toBe(201);
    expect(response.body.profile.onboarded).toBe(true);
  });

  it('candidate updates profile skills and becomes searchable', async () => {
    const response = await request(app)
      .put('/api/profile/me')
      .set('Cookie', candidateCookie)
      .send({
        headline: 'DB test profile',
        skills: [uniqueSkill.toUpperCase()], // stored lowercased
        experienceYears: 1,
        phone: '+91 98888 77777',
        currentCity: 'Testville',
        employmentStatus: 'FRESHER',
      });
    expect(response.status).toBe(200);
    expect(response.body.profile.skills).toEqual([uniqueSkill]);
  });

  it('candidate applies to the job (and cannot apply twice)', async () => {
    const first = await request(app)
      .post(`/api/jobs/${jobId}/applications`)
      .set('Cookie', candidateCookie)
      .send({ coverLetter: 'Real database application.' });
    expect(first.status).toBe(201);
    applicationId = first.body.application.id;

    const duplicate = await request(app)
      .post(`/api/jobs/${jobId}/applications`)
      .set('Cookie', candidateCookie)
      .send({});
    expect(duplicate.status).toBe(409); // real unique constraint, not a mock
  });

  it('HR sees the applicant and accepts them', async () => {
    const list = await request(app)
      .get(`/api/jobs/${jobId}/applications`)
      .set('Cookie', hrCookie);
    expect(list.status).toBe(200);
    expect(list.body.applications).toHaveLength(1);
    expect(list.body.applications[0].hasResume).toBe(true);

    const update = await request(app)
      .patch(`/api/applications/${applicationId}/status`)
      .set('Cookie', hrCookie)
      .send({ status: 'ACCEPTED' });
    expect(update.status).toBe(200);
    expect(update.body.application.status).toBe('ACCEPTED');
  });

  it('candidate sees the accepted status', async () => {
    const response = await request(app)
      .get('/api/applications/mine')
      .set('Cookie', candidateCookie);
    expect(response.status).toBe(200);
    expect(response.body.applications[0].status).toBe('ACCEPTED');
  });

  it('HR finds the candidate by skill (case-insensitive) and downloads the resume', async () => {
    const search = await request(app)
      .get(`/api/candidates?skills=${uniqueSkill.toUpperCase()}`)
      .set('Cookie', hrCookie);
    expect(search.status).toBe(200);
    expect(search.body.candidates.map((c) => c.email)).toContain(candidateEmail);

    const download = await request(app)
      .get(`/api/candidates/${candidateId}/resume`)
      .set('Cookie', hrCookie)
      .buffer(true)
      .parse((res, done) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => done(null, Buffer.concat(chunks)));
      });
    expect(download.status).toBe(200);
    expect(download.headers['content-disposition']).toMatch(/attachment/);
    expect(download.body.toString().startsWith('%PDF')).toBe(true);
  });

  it("cross-account authorization holds against real data: candidate can't accept applications", async () => {
    const response = await request(app)
      .patch(`/api/applications/${applicationId}/status`)
      .set('Cookie', candidateCookie)
      .send({ status: 'REJECTED' });
    expect(response.status).toBe(403);
  });
});
