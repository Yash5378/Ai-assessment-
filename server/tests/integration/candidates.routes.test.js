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

describe('GET /api/candidates (HR talent search)', () => {
  it('rejects unauthenticated requests with 401', async () => {
    const response = await request(app).get('/api/candidates');
    expect(response.status).toBe(401);
  });

  it('forbids candidates from searching other candidates (403)', async () => {
    const response = await request(app).get('/api/candidates').set('Cookie', asCandidate);
    expect(response.status).toBe(403);
    expect(db.query).not.toHaveBeenCalled();
  });

  it('returns matching candidates for HR with skill and experience-range filters', async () => {
    db.query.mockResolvedValueOnce({
      rows: [
        {
          id: 2,
          name: 'Test Candidate',
          email: 'user@test.com',
          phone: '+91 90000 00000',
          headline: 'Frontend developer',
          skills: ['react', 'css'],
          experienceYears: 3,
          currentCity: 'Bengaluru, India',
          expectedCtc: 18,
        },
      ],
    });

    const response = await request(app)
      .get('/api/candidates?skills=React,%20sql&minExperience=2&maxExperience=8')
      .set('Cookie', asHr);

    expect(response.status).toBe(200);
    expect(response.body.candidates).toHaveLength(1);

    // Query-string filters arrive normalized: lowercased skills, numeric exp.
    const [sql, values] = db.query.mock.calls[0];
    expect(values).toEqual([['react', 'sql'], 2, 8]);
    // Skill match is case-insensitive on the stored side too.
    expect(sql).toMatch(/lower\(skill\) = ANY/);
    expect(sql).toMatch(/experience_years >=/);
    expect(sql).toMatch(/experience_years <=/);
  });

  it('rejects a non-numeric experience filter with 400', async () => {
    const response = await request(app)
      .get('/api/candidates?minExperience=lots')
      .set('Cookie', asHr);
    expect(response.status).toBe(400);
    expect(db.query).not.toHaveBeenCalled();
  });

  it('rejects a min experience greater than max with 400', async () => {
    const response = await request(app)
      .get('/api/candidates?minExperience=8&maxExperience=2')
      .set('Cookie', asHr);
    expect(response.status).toBe(400);
    expect(db.query).not.toHaveBeenCalled();
  });
});

describe('profile routes (role enforcement)', () => {
  it('forbids HR from having a candidate profile (403)', async () => {
    const response = await request(app).get('/api/profile/me').set('Cookie', asHr);
    expect(response.status).toBe(403);
  });

  it('returns a blank profile for a candidate who has not saved one', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });
    const response = await request(app).get('/api/profile/me').set('Cookie', asCandidate);
    expect(response.status).toBe(200);
    expect(response.body.profile).toMatchObject({ skills: [], experienceYears: 0 });
  });
});
