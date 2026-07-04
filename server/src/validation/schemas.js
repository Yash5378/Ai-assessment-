const { z } = require('zod');

/**
 * All request payload shapes in one place. The frontend mirrors these rules
 * (client/src/utils/validation.js) so users get instant feedback, but the
 * backend remains the source of truth.
 */

const ROLES = ['HR', 'CANDIDATE'];
const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP'];
const JOB_STATUSES = ['OPEN', 'CLOSED'];
const REVIEWABLE_APPLICATION_STATUSES = ['UNDER_REVIEW', 'ACCEPTED', 'REJECTED'];
const EMPLOYMENT_STATUSES = ['FRESHER', 'EXPERIENCED'];
const NOTICE_PERIODS = ['IMMEDIATE', '15_DAYS', '30_DAYS', '60_DAYS', '90_DAYS'];

const email = z
  .string({ required_error: 'Email is required' })
  .trim()
  .toLowerCase()
  .email('Please provide a valid email address')
  .max(255, 'Email must be at most 255 characters');

const password = z
  .string({ required_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[0-9]/, 'Password must contain a number');

// Skills are normalized (trimmed, lowercased, deduplicated) so that
// "React" and " react " always match in searches.
const skillList = (maxItems) =>
  z
    .array(z.string().trim().toLowerCase().min(1, 'Skill cannot be empty').max(30, 'Skill must be at most 30 characters'))
    .max(maxItems, `At most ${maxItems} skills allowed`)
    .transform((skills) => [...new Set(skills)]);

// Query-string variant: "React, Node.js , sql" -> ['react', 'node.js', 'sql']
const skillsFromQuery = z
  .string()
  .transform((value) =>
    [...new Set(value.split(',').map((skill) => skill.trim().toLowerCase()).filter(Boolean))].slice(0, 15)
  )
  .optional();

// Optional free-text query param: empty strings behave like "not provided".
const optionalQueryText = (max) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || undefined)
    .optional();

const years = z.coerce
  .number({ invalid_type_error: 'Must be a number' })
  .int('Must be a whole number')
  .min(0, 'Cannot be negative')
  .max(50, 'Must be at most 50');

const salaryLpa = z.coerce
  .number({ invalid_type_error: 'Must be a number' })
  .int('Must be a whole number')
  .min(0, 'Cannot be negative')
  .max(1000, 'Must be at most 1000 LPA');

// Optional CTC/salary field: '' and null both become null (cleared).
const optionalSalaryLpa = z
  .union([z.literal(''), z.null(), z.undefined(), salaryLpa])
  .transform((value) => (value === '' || value === undefined || value === null ? null : value));

const phone = z
  .string({ required_error: 'Phone number is required' })
  .trim()
  .regex(/^[+\d][\d\s-]{6,14}$/, 'Please provide a valid phone number');

const employmentStatus = z.enum(EMPLOYMENT_STATUSES, {
  errorMap: () => ({ message: `Employment status must be one of: ${EMPLOYMENT_STATUSES.join(', ')}` }),
});

const shortText = (max) => z.string().trim().max(max, `Must be at most ${max} characters`);

/* --------------------------------- auth --------------------------------- */

const registerSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters'),
  email,
  password,
  role: z
    .enum(ROLES, { errorMap: () => ({ message: `Role must be one of: ${ROLES.join(', ')}` }) })
    .default('CANDIDATE'),
});

const loginSchema = z.object({
  email,
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required'),
});

/* --------------------------------- jobs --------------------------------- */

const jobBase = {
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(150),
  company: z.string().trim().min(2, 'Company must be at least 2 characters').max(100),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(5000),
  location: z.string().trim().min(2, 'Location must be at least 2 characters').max(100),
  employmentType: z.enum(EMPLOYMENT_TYPES, {
    errorMap: () => ({ message: `Employment type must be one of: ${EMPLOYMENT_TYPES.join(', ')}` }),
  }),
  skills: skillList(15).refine((skills) => skills.length > 0, {
    message: 'At least one skill is required',
  }),
  experienceMin: years,
  experienceMax: years.optional().nullable().transform((value) => value ?? undefined),
  salaryMin: salaryLpa.optional().nullable().transform((value) => value ?? undefined),
  salaryMax: salaryLpa.optional().nullable().transform((value) => value ?? undefined),
};

const rangesAreOrdered = (data) => {
  if (data.experienceMin !== undefined && data.experienceMax !== undefined) {
    if (data.experienceMin > data.experienceMax) return false;
  }
  if (data.salaryMin !== undefined && data.salaryMax !== undefined) {
    if (data.salaryMin > data.salaryMax) return false;
  }
  return true;
};

const createJobSchema = z
  .object(jobBase)
  .refine(rangesAreOrdered, { message: 'Minimum cannot be greater than maximum' });

const updateJobSchema = z
  .object({
    ...Object.fromEntries(Object.entries(jobBase).map(([key, schema]) => [key, schema.optional()])),
    status: z.enum(JOB_STATUSES).optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'At least one field must be provided',
  })
  .refine(rangesAreOrdered, { message: 'Minimum cannot be greater than maximum' });

// Candidate/HR job search — every filter is optional.
const jobSearchSchema = z.object({
  title: optionalQueryText(150),
  company: optionalQueryText(100),
  location: optionalQueryText(100),
  skills: skillsFromQuery,
  maxExperience: years.optional(),
  minSalary: salaryLpa.optional(),
});

/* ----------------------------- applications ----------------------------- */

const createApplicationSchema = z.object({
  // Cover letter is optional; when provided it is capped in length.
  coverLetter: z
    .string()
    .trim()
    .max(3000, 'Cover letter must be at most 3000 characters')
    .optional()
    .default(''),
});

const updateApplicationStatusSchema = z.object({
  status: z.enum(REVIEWABLE_APPLICATION_STATUSES, {
    errorMap: () => ({
      message: `Status must be one of: ${REVIEWABLE_APPLICATION_STATUSES.join(', ')}`,
    }),
  }),
});

/* ------------------------------- profiles ------------------------------- */

// Collected before a candidate can reach the app. Resume presence is
// enforced in the controller (multer populates req.file).
const onboardingSchema = z.object({
  phone,
  currentCity: z
    .string({ required_error: 'Current city is required' })
    .trim()
    .min(2, 'Current city must be at least 2 characters')
    .max(100, 'Current city must be at most 100 characters'),
  employmentStatus,
});

// Everything editable from the profile section (all optional; the profile
// page can save a partial set).
const profileSchema = z.object({
  headline: shortText(150).default(''),
  skills: skillList(15).default([]),
  experienceYears: years.default(0),
  phone: z.union([z.literal(''), phone]).default(''),
  currentCity: shortText(100).default(''),
  employmentStatus: employmentStatus.default('FRESHER'),
  currentCompany: shortText(100).default(''),
  currentDesignation: shortText(100).default(''),
  industry: shortText(100).default(''),
  department: shortText(100).default(''),
  currentCtc: optionalSalaryLpa,
  expectedCtc: optionalSalaryLpa,
  noticePeriod: z
    .union([
      z.literal(''),
      z.enum(NOTICE_PERIODS, {
        errorMap: () => ({ message: `Notice period must be one of: ${NOTICE_PERIODS.join(', ')}` }),
      }),
    ])
    .default('')
    .transform((value) => value || null),
});

// HR candidate search — every filter is optional.
const candidateSearchSchema = z
  .object({
    skills: skillsFromQuery,
    location: optionalQueryText(100),
    minExperience: years.optional(),
    maxExperience: years.optional(),
  })
  .refine(
    (data) =>
      data.minExperience === undefined ||
      data.maxExperience === undefined ||
      data.minExperience <= data.maxExperience,
    { message: 'Minimum experience cannot be greater than maximum', path: ['minExperience'] }
  );

/* -------------------------------- shared -------------------------------- */

// Coerces and rejects non-numeric ids ("/jobs/abc" -> 400, not a DB error).
const idParamSchema = z.object({
  id: z.coerce.number({ invalid_type_error: 'id must be a number' }).int().positive(),
});

module.exports = {
  registerSchema,
  loginSchema,
  createJobSchema,
  updateJobSchema,
  jobSearchSchema,
  createApplicationSchema,
  updateApplicationStatusSchema,
  onboardingSchema,
  profileSchema,
  candidateSearchSchema,
  idParamSchema,
  ROLES,
  EMPLOYMENT_TYPES,
  EMPLOYMENT_STATUSES,
  NOTICE_PERIODS,
  JOB_STATUSES,
};
