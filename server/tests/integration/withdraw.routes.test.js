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

describe('DELETE /api/applications/:id (withdraw)', () => {
  it('lets a candidate withdraw their own pending application', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ candidate_id: 2, status: 'SUBMITTED' }] })
      .mockResolvedValueOnce({ rows: [] }); // DELETE

    const response = await request(app).delete('/api/applications/7').set('Cookie', asCandidate);

    expect(response.status).toBe(200);
    const [deleteSql, deleteValues] = db.query.mock.calls[1];
    expect(deleteSql).toMatch(/DELETE FROM applications/);
    expect(deleteValues).toEqual([7]);
  });

  it("forbids withdrawing someone else's application (403)", async () => {
    db.query.mockResolvedValueOnce({ rows: [{ candidate_id: 99, status: 'SUBMITTED' }] });
    const response = await request(app).delete('/api/applications/7').set('Cookie', asCandidate);
    expect(response.status).toBe(403);
    expect(db.query).toHaveBeenCalledTimes(1); // no DELETE issued
  });

  it('rejects withdrawing a decided application (400)', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ candidate_id: 2, status: 'ACCEPTED' }] });
    const response = await request(app).delete('/api/applications/7').set('Cookie', asCandidate);
    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/already been decided/i);
  });

  it('returns 404 for a missing application', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });
    const response = await request(app).delete('/api/applications/999').set('Cookie', asCandidate);
    expect(response.status).toBe(404);
  });

  it('forbids HR from using the withdraw route (403)', async () => {
    const response = await request(app).delete('/api/applications/7').set('Cookie', asHr);
    expect(response.status).toBe(403);
    expect(db.query).not.toHaveBeenCalled();
  });
});
