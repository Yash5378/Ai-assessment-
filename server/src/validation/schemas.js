const { z } = require('zod');

/**
 * All request payload shapes in one place. The frontend mirrors these rules
 * (client/src/utils/validation.js) so users get instant feedback, but the
 * backend remains the source of truth.
 */

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

const registerSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters'),
  email,
  password,
});

const loginSchema = z.object({
  email,
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required'),
});

const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP'];
const JOB_STATUSES = ['OPEN', 'CLOSED'];
const REVIEWABLE_APPLICATION_STATUSES = ['UNDER_REVIEW', 'ACCEPTED', 'REJECTED'];

const jobBase = {
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(150),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(5000),
  location: z.string().trim().min(2, 'Location must be at least 2 characters').max(100),
  employmentType: z.enum(EMPLOYMENT_TYPES, {
    errorMap: () => ({ message: `Employment type must be one of: ${EMPLOYMENT_TYPES.join(', ')}` }),
  }),
  salaryRange: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((value) => (value === '' ? undefined : value)),
};

const createJobSchema = z.object(jobBase);

const updateJobSchema = z
  .object({
    ...Object.fromEntries(Object.entries(jobBase).map(([key, schema]) => [key, schema.optional()])),
    status: z.enum(JOB_STATUSES).optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'At least one field must be provided',
  });

const createApplicationSchema = z.object({
  coverLetter: z
    .string({ required_error: 'Cover letter is required' })
    .trim()
    .min(20, 'Cover letter must be at least 20 characters')
    .max(3000, 'Cover letter must be at most 3000 characters'),
});

const updateApplicationStatusSchema = z.object({
  status: z.enum(REVIEWABLE_APPLICATION_STATUSES, {
    errorMap: () => ({
      message: `Status must be one of: ${REVIEWABLE_APPLICATION_STATUSES.join(', ')}`,
    }),
  }),
});

// Coerces and rejects non-numeric ids ("/jobs/abc" -> 400, not a DB error).
const idParamSchema = z.object({
  id: z.coerce.number({ invalid_type_error: 'id must be a number' }).int().positive(),
});

module.exports = {
  registerSchema,
  loginSchema,
  createJobSchema,
  updateJobSchema,
  createApplicationSchema,
  updateApplicationStatusSchema,
  idParamSchema,
  EMPLOYMENT_TYPES,
  JOB_STATUSES,
};
