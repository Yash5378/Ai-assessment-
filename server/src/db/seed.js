const { pool } = require('./pool');
const { hashPassword } = require('../utils/password');

/**
 * Assessment test accounts (documented in the README). Idempotent: existing
 * rows are never overwritten, so user data survives restarts.
 */
const TEST_USERS = [
  { name: 'HR Admin', email: 'admin@test.com', password: 'Admin@1234', role: 'HR' },
  { name: 'Test Candidate', email: 'user@test.com', password: 'User@1234', role: 'CANDIDATE' },
];

// Gives the seeded candidate a searchable, already-onboarded profile so the
// assessor can log in without hitting the onboarding gate and the HR "Find
// Candidates" feature returns a hit on first run. No resume file is seeded,
// so an HR resume download for this candidate returns 404 (expected).
const TEST_CANDIDATE_PROFILE = {
  headline: 'Frontend developer with a passion for clean UIs',
  skills: ['react', 'javascript', 'css', 'html'],
  experienceYears: 3,
  phone: '+91 90000 00000',
  currentCity: 'Bengaluru, India',
  employmentStatus: 'EXPERIENCED',
  currentCompany: 'BrightApps',
  currentDesignation: 'Frontend Developer',
  currentCtc: 14,
  expectedCtc: 18,
  noticePeriod: '30_DAYS',
  industry: 'Information Technology',
  department: 'Engineering',
};

const SAMPLE_JOBS = [
  {
    title: 'Senior Frontend Engineer',
    company: 'SkyPoint Cloud',
    description:
      'We are looking for a senior frontend engineer with strong React experience to lead the development of our customer-facing dashboard. You will own component architecture, accessibility, and performance.',
    location: 'Bengaluru, India (Hybrid)',
    employmentType: 'FULL_TIME',
    skills: ['react', 'typescript', 'css', 'accessibility'],
    experienceMin: 5,
    experienceMax: 10,
    salaryMin: 25,
    salaryMax: 40,
  },
  {
    title: 'Backend Engineer (Node.js)',
    company: 'SkyPoint Cloud',
    description:
      'Join our platform team to design and build scalable REST APIs with Node.js and PostgreSQL. Experience with Docker, CI/CD pipelines and observability tooling is a strong plus.',
    location: 'Remote (India)',
    employmentType: 'FULL_TIME',
    skills: ['node.js', 'postgresql', 'docker', 'rest'],
    experienceMin: 3,
    experienceMax: 8,
    salaryMin: 20,
    salaryMax: 32,
  },
  {
    title: 'DevOps Intern',
    company: 'CloudNine Labs',
    description:
      'A six-month internship on our infrastructure team. You will learn Docker, Kubernetes and infrastructure-as-code while automating our build and deployment pipelines under mentorship.',
    location: 'Hyderabad, India (On-site)',
    employmentType: 'INTERNSHIP',
    skills: ['docker', 'kubernetes', 'linux'],
    experienceMin: 0,
    experienceMax: 1,
    salaryMin: 5,
    salaryMax: 7,
  },
  {
    title: 'QA Automation Engineer (Contract)',
    company: 'TestWorks India',
    description:
      'A twelve-month contract role building end-to-end test automation with Playwright and integrating quality gates into our CI pipeline. Strong JavaScript or TypeScript skills required.',
    location: 'Pune, India (Hybrid)',
    employmentType: 'CONTRACT',
    skills: ['playwright', 'javascript', 'ci/cd'],
    experienceMin: 2,
    experienceMax: 6,
    salaryMin: 15,
    salaryMax: 22,
  },
];

async function ensureUsers() {
  for (const user of TEST_USERS) {
    const passwordHash = await hashPassword(user.password);
    await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING`,
      [user.name, user.email, passwordHash, user.role]
    );
  }
}

async function ensureCandidateProfile() {
  const { rows } = await pool.query('SELECT id FROM users WHERE email = $1', [TEST_USERS[1].email]);
  const p = TEST_CANDIDATE_PROFILE;
  await pool.query(
    `INSERT INTO candidate_profiles
       (user_id, headline, skills, experience_years, phone, current_city,
        employment_status, onboarded, current_company, current_designation,
        current_ctc, expected_ctc, notice_period, industry, department)
     VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, $9, $10, $11, $12, $13, $14)
     ON CONFLICT (user_id) DO UPDATE SET
       onboarded = true,
       phone = CASE WHEN candidate_profiles.phone = '' THEN EXCLUDED.phone ELSE candidate_profiles.phone END,
       current_city = CASE WHEN candidate_profiles.current_city = '' THEN EXCLUDED.current_city ELSE candidate_profiles.current_city END,
       current_company = CASE WHEN candidate_profiles.current_company = '' THEN EXCLUDED.current_company ELSE candidate_profiles.current_company END,
       current_designation = CASE WHEN candidate_profiles.current_designation = '' THEN EXCLUDED.current_designation ELSE candidate_profiles.current_designation END`,
    [
      rows[0].id,
      p.headline,
      p.skills,
      p.experienceYears,
      p.phone,
      p.currentCity,
      p.employmentStatus,
      p.currentCompany,
      p.currentDesignation,
      p.currentCtc,
      p.expectedCtc,
      p.noticePeriod,
      p.industry,
      p.department,
    ]
  );
}

/**
 * Upserts each sample job by (title, seed HR user): inserts it when missing
 * and backfills the search fields on rows created before those columns
 * existed. Jobs posted by real users are never touched.
 */
async function ensureSampleJobs() {
  const hrResult = await pool.query('SELECT id FROM users WHERE email = $1', [TEST_USERS[0].email]);
  const hrId = hrResult.rows[0].id;

  for (const job of SAMPLE_JOBS) {
    const existing = await pool.query(
      'SELECT id, company FROM jobs WHERE title = $1 AND created_by = $2',
      [job.title, hrId]
    );

    if (existing.rows.length === 0) {
      await pool.query(
        `INSERT INTO jobs
           (title, company, description, location, employment_type, skills,
            experience_min, experience_max, salary_min, salary_max, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          job.title,
          job.company,
          job.description,
          job.location,
          job.employmentType,
          job.skills,
          job.experienceMin,
          job.experienceMax,
          job.salaryMin,
          job.salaryMax,
          hrId,
        ]
      );
    } else if (existing.rows[0].company === '') {
      // Legacy seed row from before the search fields existed — backfill it.
      await pool.query(
        `UPDATE jobs SET company = $1, skills = $2, experience_min = $3,
                         experience_max = $4, salary_min = $5, salary_max = $6
         WHERE id = $7`,
        [
          job.company,
          job.skills,
          job.experienceMin,
          job.experienceMax,
          job.salaryMin,
          job.salaryMax,
          existing.rows[0].id,
        ]
      );
    }
  }
}

async function seed() {
  await ensureUsers();
  await ensureCandidateProfile();
  await ensureSampleJobs();
  console.log('Seed data ensured (test users, candidate profile, sample jobs)');
}

module.exports = { seed };
