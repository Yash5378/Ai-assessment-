const db = require('../db/pool');
const ApiError = require('../utils/ApiError');

const PROFILE_FIELDS = `
  user_id AS "userId", headline, skills,
  experience_years AS "experienceYears",
  phone, current_city AS "currentCity",
  employment_status AS "employmentStatus", onboarded,
  resume_original_name AS "resumeName",
  current_company AS "currentCompany", current_ctc AS "currentCtc",
  expected_ctc AS "expectedCtc", notice_period AS "noticePeriod",
  current_designation AS "currentDesignation", industry, department,
  updated_at AS "updatedAt"
`;

const EMPTY_PROFILE = {
  headline: '',
  skills: [],
  experienceYears: 0,
  phone: '',
  currentCity: '',
  employmentStatus: 'FRESHER',
  onboarded: false,
  resumeName: null,
  currentCompany: '',
  currentCtc: null,
  expectedCtc: null,
  noticePeriod: null,
  currentDesignation: '',
  industry: '',
  department: '',
};

/**
 * A candidate who has never saved a profile gets a blank one back rather
 * than a 404 — the profile page always has something to render.
 */
async function getMyProfile(userId) {
  const result = await db.query(
    `SELECT ${PROFILE_FIELDS} FROM candidate_profiles WHERE user_id = $1`,
    [userId]
  );
  return result.rows[0] ?? { userId, ...EMPTY_PROFILE };
}

/**
 * Completes onboarding: stores the minimum required info plus the uploaded
 * resume and flips `onboarded` on. Runs once, but is safe to re-run (upsert).
 */
async function completeOnboarding(userId, data, file) {
  const result = await db.query(
    `INSERT INTO candidate_profiles
       (user_id, phone, current_city, employment_status,
        resume_filename, resume_original_name, onboarded, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, true, NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       phone = EXCLUDED.phone,
       current_city = EXCLUDED.current_city,
       employment_status = EXCLUDED.employment_status,
       resume_filename = EXCLUDED.resume_filename,
       resume_original_name = EXCLUDED.resume_original_name,
       onboarded = true,
       updated_at = NOW()
     RETURNING ${PROFILE_FIELDS}`,
    [userId, data.phone, data.currentCity, data.employmentStatus, file.filename, file.originalname]
  );
  return result.rows[0];
}

/**
 * Updates the editable profile fields. Never flips `onboarded` and never
 * touches the resume (that has its own endpoint).
 */
async function upsertMyProfile(userId, data) {
  const result = await db.query(
    `INSERT INTO candidate_profiles
       (user_id, headline, skills, experience_years, phone, current_city,
        employment_status, current_company, current_ctc, expected_ctc,
        notice_period, current_designation, industry, department, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       headline = EXCLUDED.headline,
       skills = EXCLUDED.skills,
       experience_years = EXCLUDED.experience_years,
       phone = EXCLUDED.phone,
       current_city = EXCLUDED.current_city,
       employment_status = EXCLUDED.employment_status,
       current_company = EXCLUDED.current_company,
       current_ctc = EXCLUDED.current_ctc,
       expected_ctc = EXCLUDED.expected_ctc,
       notice_period = EXCLUDED.notice_period,
       current_designation = EXCLUDED.current_designation,
       industry = EXCLUDED.industry,
       department = EXCLUDED.department,
       updated_at = NOW()
     RETURNING ${PROFILE_FIELDS}`,
    [
      userId,
      data.headline,
      data.skills,
      data.experienceYears,
      data.phone,
      data.currentCity,
      data.employmentStatus,
      data.currentCompany,
      data.currentCtc,
      data.expectedCtc,
      data.noticePeriod,
      data.currentDesignation,
      data.industry,
      data.department,
    ]
  );
  return result.rows[0];
}

async function setResume(userId, file) {
  const result = await db.query(
    `UPDATE candidate_profiles
     SET resume_filename = $2, resume_original_name = $3, updated_at = NOW()
     WHERE user_id = $1
     RETURNING resume_original_name AS "resumeName"`,
    [userId, file.filename, file.originalname]
  );
  if (result.rows.length === 0) {
    throw ApiError.badRequest('Please complete onboarding before uploading a resume');
  }
  return result.rows[0];
}

/**
 * Returns the stored file name and original name for a candidate's resume,
 * or throws 404 if they have not uploaded one.
 */
async function getResumeMeta(userId) {
  const result = await db.query(
    `SELECT resume_filename AS "filename", resume_original_name AS "originalName"
     FROM candidate_profiles WHERE user_id = $1`,
    [userId]
  );
  const meta = result.rows[0];
  if (!meta || !meta.filename) {
    throw ApiError.notFound('No resume on file for this candidate');
  }
  return meta;
}

module.exports = {
  getMyProfile,
  completeOnboarding,
  upsertMyProfile,
  setResume,
  getResumeMeta,
};
