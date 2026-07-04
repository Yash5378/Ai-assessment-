const db = require('../db/pool');

/**
 * Dashboard counters for an HR user, scoped to the jobs they created.
 */
async function getHrStats(user) {
  const result = await db.query(
    `SELECT
       COUNT(DISTINCT j.id)::int                                            AS "totalJobs",
       COUNT(DISTINCT j.id) FILTER (WHERE j.status = 'OPEN')::int           AS "openJobs",
       COUNT(a.id)::int                                                     AS "totalApplications",
       COUNT(a.id) FILTER (WHERE a.status IN ('SUBMITTED', 'UNDER_REVIEW'))::int AS "pendingApplications"
     FROM jobs j
     LEFT JOIN applications a ON a.job_id = j.id
     WHERE j.created_by = $1`,
    [user.id]
  );
  return result.rows[0];
}

module.exports = { getHrStats };
