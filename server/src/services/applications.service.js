const db = require('../db/pool');
const ApiError = require('../utils/ApiError');
const { assertJobOwnership } = require('./jobs.service');
const { createNotification } = require('./notifications.service');

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
            u.name AS "candidateName", u.email AS "candidateEmail",
            (p.resume_filename IS NOT NULL) AS "hasResume"
     FROM applications a
     JOIN users u ON u.id = a.candidate_id
     LEFT JOIN candidate_profiles p ON p.user_id = a.candidate_id
     WHERE a.job_id = $1
     ORDER BY a.created_at DESC`,
    [jobId]
  );
  return result.rows;
}

const STATUS_LABELS = {
  UNDER_REVIEW: 'is now under review',
  ACCEPTED: 'has been accepted — congratulations!',
  REJECTED: 'was not selected this time',
};

/**
 * HR moves an application through the review pipeline. Only the owner of
 * the job the application belongs to may do this. The candidate gets an
 * in-app notification about the change.
 */
async function updateApplicationStatus(user, applicationId, status) {
  const result = await db.query(
    `SELECT a.job_id, a.candidate_id, j.title
     FROM applications a JOIN jobs j ON j.id = a.job_id
     WHERE a.id = $1`,
    [applicationId]
  );
  const application = result.rows[0];
  if (!application) {
    throw ApiError.notFound('Application not found');
  }
  await assertJobOwnership(user, application.job_id);

  const updated = await db.query(
    `UPDATE applications SET status = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING ${applicationFields()}`,
    [status, applicationId]
  );

  await createNotification(
    application.candidate_id,
    `Your application for "${application.title}" ${STATUS_LABELS[status]}`
  );

  return updated.rows[0];
}

/**
 * A candidate may withdraw their own application while it is still in play
 * (SUBMITTED or UNDER_REVIEW). Decided applications are immutable history.
 * Withdrawing frees the unique slot, so the candidate may re-apply later.
 */
async function withdrawApplication(user, applicationId) {
  const result = await db.query('SELECT candidate_id, status FROM applications WHERE id = $1', [
    applicationId,
  ]);
  const application = result.rows[0];
  if (!application) {
    throw ApiError.notFound('Application not found');
  }
  if (application.candidate_id !== user.id) {
    throw ApiError.forbidden('You can only withdraw your own applications');
  }
  if (application.status === 'ACCEPTED' || application.status === 'REJECTED') {
    throw ApiError.badRequest('This application has already been decided and cannot be withdrawn');
  }
  await db.query('DELETE FROM applications WHERE id = $1', [applicationId]);
}

module.exports = {
  applyToJob,
  listMyApplications,
  listApplicationsForJob,
  updateApplicationStatus,
  withdrawApplication,
};
