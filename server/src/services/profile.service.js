const db = require('../db/pool');

const PROFILE_FIELDS = `
  user_id AS "userId", headline, skills,
  experience_years AS "experienceYears", location,
  expected_salary AS "expectedSalary", updated_at AS "updatedAt"
`;

const EMPTY_PROFILE = {
  headline: '',
  skills: [],
  experienceYears: 0,
  location: '',
  expectedSalary: null,
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
 * Create-or-update in one statement; the profile is what makes a candidate
 * discoverable in HR skill searches.
 */
async function upsertMyProfile(userId, data) {
  const result = await db.query(
    `INSERT INTO candidate_profiles
       (user_id, headline, skills, experience_years, location, expected_salary, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       headline = EXCLUDED.headline,
       skills = EXCLUDED.skills,
       experience_years = EXCLUDED.experience_years,
       location = EXCLUDED.location,
       expected_salary = EXCLUDED.expected_salary,
       updated_at = NOW()
     RETURNING ${PROFILE_FIELDS}`,
    [userId, data.headline, data.skills, data.experienceYears, data.location, data.expectedSalary]
  );
  return result.rows[0];
}

module.exports = { getMyProfile, upsertMyProfile };
