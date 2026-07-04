const db = require('../db/pool');
const ApiError = require('../utils/ApiError');

const JOB_FIELDS = `
  j.id, j.title, j.description, j.location,
  j.employment_type AS "employmentType", j.salary_range AS "salaryRange",
  j.status, j.created_by AS "createdBy",
  j.created_at AS "createdAt", j.updated_at AS "updatedAt"
`;

// Maps API field names to table columns for dynamic (but still fully
// parameterized) UPDATE statements.
const UPDATABLE_COLUMNS = {
  title: 'title',
  description: 'description',
  location: 'location',
  employmentType: 'employment_type',
  salaryRange: 'salary_range',
  status: 'status',
};

/**
 * Candidates see open positions (plus whether they already applied);
 * HR sees every job with its applicant count.
 */
async function listJobs(user) {
  if (user.role === 'CANDIDATE') {
    const result = await db.query(
      `SELECT ${JOB_FIELDS},
              (a.id IS NOT NULL) AS "hasApplied"
       FROM jobs j
       LEFT JOIN applications a ON a.job_id = j.id AND a.candidate_id = $1
       WHERE j.status = 'OPEN'
       ORDER BY j.created_at DESC`,
      [user.id]
    );
    return result.rows;
  }

  const result = await db.query(
    `SELECT ${JOB_FIELDS},
            COUNT(a.id)::int AS "applicationCount"
     FROM jobs j
     LEFT JOIN applications a ON a.job_id = j.id
     GROUP BY j.id
     ORDER BY j.created_at DESC`
  );
  return result.rows;
}

async function getJobById(user, jobId) {
  const result = await db.query(`SELECT ${JOB_FIELDS} FROM jobs j WHERE j.id = $1`, [jobId]);
  const job = result.rows[0];
  if (!job) {
    throw ApiError.notFound('Job not found');
  }
  // Candidates cannot browse closed positions.
  if (user.role === 'CANDIDATE' && job.status !== 'OPEN') {
    throw ApiError.notFound('Job not found');
  }
  return job;
}

async function createJob(user, data) {
  const result = await db.query(
    `INSERT INTO jobs (title, description, location, employment_type, salary_range, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [data.title, data.description, data.location, data.employmentType, data.salaryRange ?? null, user.id]
  );
  return getJobById(user, result.rows[0].id);
}

/**
 * Only the HR user who created a job may modify it.
 */
async function assertJobOwnership(user, jobId) {
  const result = await db.query('SELECT created_by FROM jobs WHERE id = $1', [jobId]);
  if (result.rows.length === 0) {
    throw ApiError.notFound('Job not found');
  }
  if (result.rows[0].created_by !== user.id) {
    throw ApiError.forbidden('You can only manage jobs you created');
  }
}

async function updateJob(user, jobId, data) {
  await assertJobOwnership(user, jobId);

  const assignments = [];
  const values = [];
  for (const [field, value] of Object.entries(data)) {
    const column = UPDATABLE_COLUMNS[field];
    if (column && value !== undefined) {
      values.push(value);
      assignments.push(`${column} = $${values.length}`);
    }
  }
  values.push(jobId);

  await db.query(
    `UPDATE jobs SET ${assignments.join(', ')}, updated_at = NOW() WHERE id = $${values.length}`,
    values
  );
  return getJobById(user, jobId);
}

module.exports = { listJobs, getJobById, createJob, updateJob, assertJobOwnership };
