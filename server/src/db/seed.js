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

const SAMPLE_JOBS = [
  {
    title: 'Senior Frontend Engineer',
    description:
      'We are looking for a senior frontend engineer with strong React experience to lead the development of our customer-facing dashboard. You will own component architecture, accessibility, and performance.',
    location: 'Bengaluru, India (Hybrid)',
    employmentType: 'FULL_TIME',
    salaryRange: '₹25L – ₹40L per year',
  },
  {
    title: 'Backend Engineer (Node.js)',
    description:
      'Join our platform team to design and build scalable REST APIs with Node.js and PostgreSQL. Experience with Docker, CI/CD pipelines and observability tooling is a strong plus.',
    location: 'Remote (India)',
    employmentType: 'FULL_TIME',
    salaryRange: '₹20L – ₹32L per year',
  },
  {
    title: 'DevOps Intern',
    description:
      'A six-month internship on our infrastructure team. You will learn Docker, Kubernetes and infrastructure-as-code while automating our build and deployment pipelines under mentorship.',
    location: 'Hyderabad, India (On-site)',
    employmentType: 'INTERNSHIP',
    salaryRange: '₹40K – ₹60K per month',
  },
  {
    title: 'QA Automation Engineer (Contract)',
    description:
      'A twelve-month contract role building end-to-end test automation with Playwright and integrating quality gates into our CI pipeline. Strong JavaScript or TypeScript skills required.',
    location: 'Pune, India (Hybrid)',
    employmentType: 'CONTRACT',
    salaryRange: '₹15L – ₹22L per year',
  },
];

/**
 * Seeds test users (always ensured) and sample jobs (only when the jobs
 * table is empty, so restarts never duplicate data).
 */
async function seed() {
  for (const user of TEST_USERS) {
    const passwordHash = await hashPassword(user.password);
    await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING`,
      [user.name, user.email, passwordHash, user.role]
    );
  }

  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM jobs');
  if (rows[0].count > 0) {
    return;
  }

  const hrResult = await pool.query('SELECT id FROM users WHERE email = $1', [TEST_USERS[0].email]);
  const hrId = hrResult.rows[0].id;

  for (const job of SAMPLE_JOBS) {
    await pool.query(
      `INSERT INTO jobs (title, description, location, employment_type, salary_range, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [job.title, job.description, job.location, job.employmentType, job.salaryRange, hrId]
    );
  }
  console.log(`Seeded ${TEST_USERS.length} test users and ${SAMPLE_JOBS.length} sample jobs`);
}

module.exports = { seed };
