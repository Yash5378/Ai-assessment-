const db = require('../db/pool');
const ApiError = require('../utils/ApiError');

const JOB_FIELDS = `
  j.id, j.title, j.company, j.description, j.location,
  j.employment_type AS "employmentType", j.skills,
  j.experience_min AS "experienceMin", j.experience_max AS "experienceMax",
  j.salary_min AS "salaryMin", j.salary_max AS "salaryMax",
  j.status, j.created_by AS "createdBy",
  j.created_at AS "createdAt", j.updated_at AS "updatedAt"
`;

// Maps API field names to table columns for dynamic (but still fully
// parameterized) UPDATE statements.
const UPDATABLE_COLUMNS = {
  title: 'title',
  company: 'company',
  description: 'description',
  location: 'location',
  employmentType: 'employment_type',
  skills: 'skills',
  experienceMin: 'experience_min',
  experienceMax: 'experience_max',
  salaryMin: 'salary_min',
  salaryMax: 'salary_max',
  status: 'status',
};

/**
 * Appends WHERE clauses for the optional search filters. Everything is
 * parameterized — filter values never enter the SQL string itself.
 */
function applySearchFilters(filters, conditions, values) {
  if (filters.title) {
    values.push(`%${filters.title}%`);
    conditions.push(`j.title ILIKE $${values.length}`);
  }
  if (filters.company) {
    values.push(`%${filters.company}%`);
    conditions.push(`j.company ILIKE $${values.length}`);
  }
  if (filters.location) {
    values.push(`%${filters.location}%`);
    conditions.push(`j.location ILIKE $${values.length}`);
  }
  if (filters.skills && filters.skills.length > 0) {
    values.push(filters.skills);
    conditions.push(`j.skills && $${values.length}`); // array overlap: any matching skill
  }
  if (filters.maxExperience !== undefined) {
    // "I have N years" -> show jobs whose minimum requirement fits.
    values.push(filters.maxExperience);
    conditions.push(`j.experience_min <= $${values.length}`);
  }
  if (filters.minSalary !== undefined) {
    values.push(filters.minSalary);
    conditions.push(`COALESCE(j.salary_max, j.salary_min, 0) >= $${values.length}`);
  }
}

/**
 * Candidates see open positions (plus whether they already applied);
 * HR sees every job with its applicant count. Both can narrow the list
 * with search filters (title/company/location/skills/experience/salary).
 */
async function listJobs(user, filters = {}) {
  const conditions = [];
  const values = [];

  if (user.role === 'CANDIDATE') {
    values.push(user.id);
    conditions.push(`j.status = 'OPEN'`);
    applySearchFilters(filters, conditions, values);

    const result = await db.query(
      `SELECT ${JOB_FIELDS},
              (a.id IS NOT NULL) AS "hasApplied"
       FROM jobs j
       LEFT JOIN applications a ON a.job_id = j.id AND a.candidate_id = $1
       WHERE ${conditions.join(' AND ')}
       ORDER BY j.created_at DESC`,
      values
    );
    return result.rows;
  }

  applySearchFilters(filters, conditions, values);
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await db.query(
    `SELECT ${JOB_FIELDS},
            COUNT(a.id)::int AS "applicationCount"
     FROM jobs j
     LEFT JOIN applications a ON a.job_id = j.id
     ${where}
     GROUP BY j.id
     ORDER BY j.created_at DESC`,
    values
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
    `INSERT INTO jobs
       (title, company, description, location, employment_type, skills,
        experience_min, experience_max, salary_min, salary_max, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id`,
    [
      data.title,
      data.company,
      data.description,
      data.location,
      data.employmentType,
      data.skills,
      data.experienceMin,
      data.experienceMax ?? null,
      data.salaryMin ?? null,
      data.salaryMax ?? null,
      user.id,
    ]
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
