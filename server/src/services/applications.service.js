const db = require('../db/pool');
const ApiError = require('../utils/ApiError');
const { assertJobOwnership } = require('./jobs.service');

// Builds the selected columns with an optional table alias so the same list
// works in JOIN queries ("a.") and in RETURNING clauses (no alias).
const applicationFields = (p = '') => `
  ${p}id, ${p}job_id AS "jobId", ${p}candidate_id AS "candidateId",
  ${p}cover_letter AS "coverLetter", ${p}status,
  ${p}created_at AS "createdAt", ${p}updated_at AS "updatedAt"
`;

/**
 * A candidate applies to a job. Edge cases handled explicitly:
 * unknown job (404), closed job (400), duplicate application (409 — also
 * enforced by a DB unique constraint as the last line of defense).
 */
async function applyToJob(user, jobId, coverLetter) {
  const jobResult = await db.query('SELECT status FROM jobs WHERE id = $1', [jobId]);
  const job = jobResult.rows[0];
  if (!job) {
    throw ApiError.notFound('Job not found');
  }
  if (job.status !== 'OPEN') {
    throw ApiError.badRequest('This position is no longer accepting applications');
  }

  try {
    const result = await db.query(
      `INSERT INTO applications (job_id, candidate_id, cover_letter)
       VALUES ($1, $2, $3)
       RETURNING ${applicationFields()}`,
      [jobId, user.id, coverLetter]
    );
    return result.rows[0];
  } catch (err) {
    if (err.code === '23505') {
      throw ApiError.conflict('You have already applied to this job');
    }
    throw err;
  }
}

async function listMyApplications(user) {
  const result = await db.query(
    `SELECT ${applicationFields('a.')},
            j.title AS "jobTitle", j.location AS "jobLocation",
            j.employment_type AS "employmentType", j.status AS "jobStatus"
     FROM applications a
     JOIN jobs j ON j.id = a.job_id
     WHERE a.candidate_id = $1
     ORDER BY a.created_at DESC`,
    [user.id]
  );
  return result.rows;
}

/**
 * HR view of everyone who applied to one of their jobs.
 */
async function listApplicationsForJob(user, jobId) {
  await assertJobOwnership(user, jobId);

  const result = await db.query(
    `SELECT ${applicationFields('a.')},
            u.name AS "candidateName", u.email AS "candidateEmail"
     FROM applications a
     JOIN users u ON u.id = a.candidate_id
     WHERE a.job_id = $1
     ORDER BY a.created_at DESC`,
    [jobId]
  );
  return result.rows;
}

/**
 * HR moves an application through the review pipeline. Only the owner of
 * the job the application belongs to may do this.
 */
async function updateApplicationStatus(user, applicationId, status) {
  const result = await db.query('SELECT job_id FROM applications WHERE id = $1', [applicationId]);
  if (result.rows.length === 0) {
    throw ApiError.notFound('Application not found');
  }
  await assertJobOwnership(user, result.rows[0].job_id);

  const updated = await db.query(
    `UPDATE applications SET status = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING ${applicationFields()}`,
    [status, applicationId]
  );
  return updated.rows[0];
}

module.exports = {
  applyToJob,
  listMyApplications,
  listApplicationsForJob,
  updateApplicationStatus,
};
