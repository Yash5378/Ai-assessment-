const { pool } = require('./pool');

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(20)  NOT NULL CHECK (role IN ('HR', 'CANDIDATE')),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS jobs (
    id              SERIAL PRIMARY KEY,
    title           VARCHAR(150) NOT NULL,
    company         VARCHAR(100) NOT NULL DEFAULT '',
    description     TEXT         NOT NULL,
    location        VARCHAR(100) NOT NULL,
    employment_type VARCHAR(30)  NOT NULL CHECK (employment_type IN ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP')),
    skills          TEXT[]       NOT NULL DEFAULT '{}',
    experience_min  INTEGER      NOT NULL DEFAULT 0,
    experience_max  INTEGER,
    salary_min      INTEGER,
    salary_max      INTEGER,
    status          VARCHAR(20)  NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
    created_by      INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS applications (
    id           SERIAL PRIMARY KEY,
    job_id       INTEGER     NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    candidate_id INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cover_letter TEXT        NOT NULL,
    status       VARCHAR(20) NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (job_id, candidate_id)
  );

  CREATE TABLE IF NOT EXISTS candidate_profiles (
    user_id          INTEGER      PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    headline         VARCHAR(150) NOT NULL DEFAULT '',
    skills           TEXT[]       NOT NULL DEFAULT '{}',
    experience_years INTEGER      NOT NULL DEFAULT 0,
    location         VARCHAR(100) NOT NULL DEFAULT '',
    expected_salary  INTEGER,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  );

  -- Upgrade path for databases created before job search fields existed
  -- (all idempotent, so fresh databases are unaffected).
  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS company VARCHAR(100) NOT NULL DEFAULT '';
  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS skills TEXT[] NOT NULL DEFAULT '{}';
  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS experience_min INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS experience_max INTEGER;
  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS salary_min INTEGER;
  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS salary_max INTEGER;
  ALTER TABLE jobs DROP COLUMN IF EXISTS salary_range;

  CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
  CREATE INDEX IF NOT EXISTS idx_jobs_skills ON jobs USING GIN (skills);
  CREATE INDEX IF NOT EXISTS idx_applications_job ON applications(job_id);
  CREATE INDEX IF NOT EXISTS idx_applications_candidate ON applications(candidate_id);
  CREATE INDEX IF NOT EXISTS idx_candidate_profiles_skills ON candidate_profiles USING GIN (skills);
`;

/**
 * Idempotent schema migration — safe to run on every startup.
 */
async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(SCHEMA);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { migrate };
