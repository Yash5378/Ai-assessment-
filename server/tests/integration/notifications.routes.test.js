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

describe('GET /api/notifications', () => {
  it('requires authentication (401)', async () => {
    const response = await request(app).get('/api/notifications');
    expect(response.status).toBe(401);
  });

  it('returns the feed with an unread count', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [{ id: 5, message: 'Your application …', isRead: false, createdAt: 'now' }],
      })
      .mockResolvedValueOnce({ rows: [{ count: 1 }] });

    const response = await request(app).get('/api/notifications').set('Cookie', asCandidate);

    expect(response.status).toBe(200);
    expect(response.body.unreadCount).toBe(1);
    expect(response.body.notifications).toHaveLength(1);
  });
});

describe('POST /api/notifications/read', () => {
  it('marks everything read for the current user only', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });
    const response = await request(app).post('/api/notifications/read').set('Cookie', asCandidate);

    expect(response.status).toBe(200);
    const [sql, values] = db.query.mock.calls[0];
    expect(sql).toMatch(/UPDATE notifications SET is_read = true/);
    expect(values).toEqual([2]);
  });
});

describe('status change creates a candidate notification', () => {
  it('inserts a notification for the applicant when HR updates status', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [{ job_id: 10, candidate_id: 2, title: 'Backend Engineer' }],
      })
      .mockResolvedValueOnce({ rows: [{ created_by: 1 }] }) // ownership check
      .mockResolvedValueOnce({ rows: [{ id: 7, status: 'ACCEPTED' }] }) // update
      .mockResolvedValueOnce({ rows: [] }); // notification insert

    const response = await request(app)
      .patch('/api/applications/7/status')
      .set('Cookie', asHr)
      .send({ status: 'ACCEPTED' });

    expect(response.status).toBe(200);
    const [insertSql, insertValues] = db.query.mock.calls[3];
    expect(insertSql).toMatch(/INSERT INTO notifications/);
    expect(insertValues[0]).toBe(2); // the candidate, not the HR actor
    expect(insertValues[1]).toMatch(/Backend Engineer.*accepted/);
  });
});
