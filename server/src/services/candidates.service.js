const db = require('../db/pool');

/**
 * HR talent search over candidates who have published a profile.
 * All filters are optional and fully parameterized.
 */
async function searchCandidates(filters = {}) {
  const conditions = [`u.role = 'CANDIDATE'`];
  const values = [];

  if (filters.skills && filters.skills.length > 0) {
    // Case-insensitive on both sides: the search terms are already
    // lowercased, and each stored skill is lowered here too, so a search for
    // "react" matches "React", "REACT", etc. regardless of how it was saved.
    values.push(filters.skills);
    conditions.push(
      `EXISTS (SELECT 1 FROM unnest(p.skills) AS skill WHERE lower(skill) = ANY($${values.length}))`
    );
  }
  if (filters.location) {
    values.push(`%${filters.location}%`);
    conditions.push(`p.current_city ILIKE $${values.length}`); // ILIKE = case-insensitive
  }
  if (filters.minExperience !== undefined) {
    values.push(filters.minExperience);
    conditions.push(`p.experience_years >= $${values.length}`);
  }
  if (filters.maxExperience !== undefined) {
    values.push(filters.maxExperience);
    conditions.push(`p.experience_years <= $${values.length}`);
  }

  const result = await db.query(
    `SELECT u.id, u.name, u.email,
            p.headline, p.skills,
            p.experience_years AS "experienceYears",
            p.phone, p.current_city AS "currentCity",
            p.employment_status AS "employmentStatus",
            p.current_company AS "currentCompany",
            p.current_designation AS "currentDesignation",
            p.current_ctc AS "currentCtc",
            p.expected_ctc AS "expectedCtc",
            p.notice_period AS "noticePeriod",
            (p.resume_filename IS NOT NULL) AS "hasResume",
            p.updated_at AS "profileUpdatedAt"
     FROM users u
     JOIN candidate_profiles p ON p.user_id = u.id
     WHERE ${conditions.join(' AND ')}
     ORDER BY p.updated_at DESC`,
    values
  );
  return result.rows;
}

module.exports = { searchCandidates };
