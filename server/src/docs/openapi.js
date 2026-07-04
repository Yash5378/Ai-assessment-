/**
 * OpenAPI 3.0 specification for the Recruitment Portal API.
 * Served interactively at /api/docs and as JSON at /api/docs.json.
 */

const ref = (name) => ({ $ref: `#/components/schemas/${name}` });

const errorResponse = (description) => ({
  description,
  content: { 'application/json': { schema: ref('Error') } },
});

const RESPONSES = {
  400: errorResponse('Validation failed (details lists offending fields)'),
  401: errorResponse('Not authenticated or session expired'),
  403: errorResponse('Authenticated but not allowed (wrong role or not the owner)'),
  404: errorResponse('Resource not found'),
  409: errorResponse('Conflict (duplicate email or duplicate application)'),
};

const jsonBody = (schema, required = true) => ({
  required,
  content: { 'application/json': { schema } },
});

const jsonResponse = (description, schema) => ({
  description,
  content: { 'application/json': { schema } },
});

const idParam = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'integer', minimum: 1 },
};

const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'Recruitment Portal API',
    version: '1.0.0',
    description:
      'REST API for the Recruitment Portal. Authentication uses a JWT stored in an ' +
      'httpOnly cookie set by `/auth/login` or `/auth/register` — the interactive ' +
      '"Try it out" works once you log in via the login endpoint below. Roles: **HR** ' +
      '(post jobs, review applicants, search candidates) and **CANDIDATE** (onboard, ' +
      'apply, manage profile).',
  },
  servers: [{ url: '/api' }],
  tags: [
    { name: 'Auth' },
    { name: 'Jobs' },
    { name: 'Applications' },
    { name: 'Profile', description: 'Candidate-only profile & resume' },
    { name: 'Candidates', description: 'HR-only talent search' },
    { name: 'Meta' },
  ],
  components: {
    securitySchemes: {
      cookieAuth: { type: 'apiKey', in: 'cookie', name: 'token' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          details: {
            type: 'array',
            items: {
              type: 'object',
              properties: { field: { type: 'string' }, message: { type: 'string' } },
            },
          },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['HR', 'CANDIDATE'] },
          onboarded: { type: 'boolean', description: 'HR is always true' },
        },
      },
      Job: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          title: { type: 'string' },
          company: { type: 'string' },
          description: { type: 'string' },
          location: { type: 'string' },
          employmentType: {
            type: 'string',
            enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP'],
          },
          skills: { type: 'array', items: { type: 'string' } },
          experienceMin: { type: 'integer' },
          experienceMax: { type: 'integer', nullable: true },
          salaryMin: { type: 'integer', nullable: true, description: '₹ LPA' },
          salaryMax: { type: 'integer', nullable: true, description: '₹ LPA' },
          status: { type: 'string', enum: ['OPEN', 'CLOSED'] },
          createdBy: { type: 'integer' },
          hasApplied: { type: 'boolean', description: 'candidate view only' },
          applicationCount: { type: 'integer', description: 'HR view only' },
        },
      },
      JobInput: {
        type: 'object',
        required: [
          'title',
          'company',
          'description',
          'location',
          'employmentType',
          'skills',
          'experienceMin',
        ],
        properties: {
          title: { type: 'string', minLength: 3, maxLength: 150 },
          company: { type: 'string', minLength: 2, maxLength: 100 },
          description: { type: 'string', minLength: 10, maxLength: 5000 },
          location: { type: 'string', minLength: 2, maxLength: 100 },
          employmentType: {
            type: 'string',
            enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP'],
          },
          skills: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 15 },
          experienceMin: { type: 'integer', minimum: 0, maximum: 50 },
          experienceMax: { type: 'integer', nullable: true },
          salaryMin: { type: 'integer', nullable: true, description: '₹ LPA' },
          salaryMax: { type: 'integer', nullable: true, description: '₹ LPA' },
        },
      },
      Application: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          jobId: { type: 'integer' },
          candidateId: { type: 'integer' },
          coverLetter: { type: 'string' },
          status: {
            type: 'string',
            enum: ['SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED'],
          },
          candidateName: { type: 'string', description: 'HR view only' },
          candidateEmail: { type: 'string', description: 'HR view only' },
          hasResume: { type: 'boolean', description: 'HR view only' },
        },
      },
      Profile: {
        type: 'object',
        properties: {
          userId: { type: 'integer' },
          headline: { type: 'string' },
          skills: { type: 'array', items: { type: 'string' } },
          experienceYears: { type: 'integer' },
          phone: { type: 'string' },
          currentCity: { type: 'string' },
          employmentStatus: { type: 'string', enum: ['FRESHER', 'EXPERIENCED'] },
          onboarded: { type: 'boolean' },
          resumeName: { type: 'string', nullable: true },
          currentCompany: { type: 'string' },
          currentCtc: { type: 'integer', nullable: true, description: '₹ LPA' },
          expectedCtc: { type: 'integer', nullable: true, description: '₹ LPA' },
          noticePeriod: {
            type: 'string',
            nullable: true,
            enum: ['IMMEDIATE', '15_DAYS', '30_DAYS', '60_DAYS', '90_DAYS', null],
          },
          currentDesignation: { type: 'string' },
          industry: { type: 'string' },
          department: { type: 'string' },
        },
      },
      Candidate: {
        type: 'object',
        description: 'HR search result: public user info + profile summary',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
          headline: { type: 'string' },
          skills: { type: 'array', items: { type: 'string' } },
          experienceYears: { type: 'integer' },
          currentCity: { type: 'string' },
          currentCompany: { type: 'string' },
          currentDesignation: { type: 'string' },
          expectedCtc: { type: 'integer', nullable: true },
          noticePeriod: { type: 'string', nullable: true },
          hasResume: { type: 'boolean' },
        },
      },
      Stats: {
        type: 'object',
        properties: {
          totalJobs: { type: 'integer' },
          openJobs: { type: 'integer' },
          totalApplications: { type: 'integer' },
          pendingApplications: { type: 'integer' },
        },
      },
    },
  },
  security: [{ cookieAuth: [] }],
  paths: {
    '/health': {
      get: {
        tags: ['Meta'],
        summary: 'Liveness probe (public)',
        security: [],
        responses: { 200: jsonResponse('Service is up', { type: 'object' }) },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Create an account (HR or Candidate) and start a session',
        security: [],
        requestBody: jsonBody({
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            name: { type: 'string', minLength: 2, maxLength: 100 },
            email: { type: 'string', format: 'email' },
            password: {
              type: 'string',
              description: 'Min 8 chars with upper, lower and a number',
            },
            role: { type: 'string', enum: ['HR', 'CANDIDATE'], default: 'CANDIDATE' },
          },
        }),
        responses: {
          201: jsonResponse('Account created; auth cookie set', {
            type: 'object',
            properties: { user: ref('User') },
          }),
          400: RESPONSES[400],
          409: RESPONSES[409],
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in (sets httpOnly auth cookie)',
        security: [],
        requestBody: jsonBody({
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'admin@test.com' },
            password: { type: 'string', example: 'Admin@1234' },
          },
        }),
        responses: {
          200: jsonResponse('Logged in', { type: 'object', properties: { user: ref('User') } }),
          401: RESPONSES[401],
          429: errorResponse('Too many attempts (rate limited)'),
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Log out (clears the auth cookie)',
        responses: { 200: jsonResponse('Logged out', { type: 'object' }), 401: RESPONSES[401] },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Current session user',
        responses: {
          200: jsonResponse('Current user', { type: 'object', properties: { user: ref('User') } }),
          401: RESPONSES[401],
        },
      },
    },
    '/jobs': {
      get: {
        tags: ['Jobs'],
        summary: 'List/search jobs (candidates see OPEN only; HR sees all)',
        parameters: [
          { name: 'title', in: 'query', schema: { type: 'string' } },
          { name: 'company', in: 'query', schema: { type: 'string' } },
          { name: 'location', in: 'query', schema: { type: 'string' } },
          {
            name: 'skills',
            in: 'query',
            schema: { type: 'string' },
            description: 'Comma-separated, case-insensitive (e.g. react,sql)',
          },
          {
            name: 'maxExperience',
            in: 'query',
            schema: { type: 'integer' },
            description: 'Your experience in years; shows jobs whose minimum fits',
          },
          { name: 'minSalary', in: 'query', schema: { type: 'integer' }, description: '₹ LPA' },
        ],
        responses: {
          200: jsonResponse('Matching jobs', {
            type: 'object',
            properties: { jobs: { type: 'array', items: ref('Job') } },
          }),
          401: RESPONSES[401],
        },
      },
      post: {
        tags: ['Jobs'],
        summary: 'Create a job (HR only)',
        requestBody: jsonBody(ref('JobInput')),
        responses: {
          201: jsonResponse('Created', { type: 'object', properties: { job: ref('Job') } }),
          400: RESPONSES[400],
          401: RESPONSES[401],
          403: RESPONSES[403],
        },
      },
    },
    '/jobs/{id}': {
      get: {
        tags: ['Jobs'],
        summary: 'Job detail (candidates cannot see CLOSED jobs)',
        parameters: [idParam],
        responses: {
          200: jsonResponse('Job', { type: 'object', properties: { job: ref('Job') } }),
          401: RESPONSES[401],
          404: RESPONSES[404],
        },
      },
      patch: {
        tags: ['Jobs'],
        summary: 'Update a job (HR, owner only); include status to open/close',
        parameters: [idParam],
        requestBody: jsonBody({
          allOf: [ref('JobInput')],
          description: 'Any subset of JobInput fields plus optional status OPEN|CLOSED',
        }),
        responses: {
          200: jsonResponse('Updated', { type: 'object', properties: { job: ref('Job') } }),
          400: RESPONSES[400],
          403: RESPONSES[403],
          404: RESPONSES[404],
        },
      },
    },
    '/jobs/{id}/applications': {
      get: {
        tags: ['Applications'],
        summary: "List a job's applicants (HR, owner only)",
        parameters: [idParam],
        responses: {
          200: jsonResponse('Applicants', {
            type: 'object',
            properties: { applications: { type: 'array', items: ref('Application') } },
          }),
          403: RESPONSES[403],
          404: RESPONSES[404],
        },
      },
      post: {
        tags: ['Applications'],
        summary: 'Apply to a job (candidate only; one application per job)',
        parameters: [idParam],
        requestBody: jsonBody({
          type: 'object',
          properties: {
            coverLetter: { type: 'string', maxLength: 3000, description: 'Optional' },
          },
        }),
        responses: {
          201: jsonResponse('Application created', {
            type: 'object',
            properties: { application: ref('Application') },
          }),
          400: errorResponse('Job is closed / invalid payload'),
          403: RESPONSES[403],
          404: RESPONSES[404],
          409: RESPONSES[409],
        },
      },
    },
    '/applications/mine': {
      get: {
        tags: ['Applications'],
        summary: 'My applications with live status (candidate only)',
        responses: {
          200: jsonResponse('Applications', {
            type: 'object',
            properties: { applications: { type: 'array', items: ref('Application') } },
          }),
          403: RESPONSES[403],
        },
      },
    },
    '/applications/{id}': {
      delete: {
        tags: ['Applications'],
        summary: 'Withdraw my application (candidate; only while SUBMITTED/UNDER_REVIEW)',
        parameters: [idParam],
        responses: {
          200: jsonResponse('Withdrawn', { type: 'object' }),
          400: errorResponse('Application already decided (accepted/rejected)'),
          403: RESPONSES[403],
          404: RESPONSES[404],
        },
      },
    },
    '/applications/{id}/status': {
      patch: {
        tags: ['Applications'],
        summary: 'Move an application through the pipeline (HR, job owner only)',
        parameters: [idParam],
        requestBody: jsonBody({
          type: 'object',
          required: ['status'],
          properties: {
            status: { type: 'string', enum: ['UNDER_REVIEW', 'ACCEPTED', 'REJECTED'] },
          },
        }),
        responses: {
          200: jsonResponse('Updated', {
            type: 'object',
            properties: { application: ref('Application') },
          }),
          403: RESPONSES[403],
          404: RESPONSES[404],
        },
      },
    },
    '/profile/me': {
      get: {
        tags: ['Profile'],
        summary: 'My profile (candidate only; blank profile if never saved)',
        responses: {
          200: jsonResponse('Profile', {
            type: 'object',
            properties: { profile: ref('Profile') },
          }),
          403: RESPONSES[403],
        },
      },
      put: {
        tags: ['Profile'],
        summary: 'Create/update my profile details (candidate only)',
        requestBody: jsonBody(ref('Profile')),
        responses: {
          200: jsonResponse('Saved', { type: 'object', properties: { profile: ref('Profile') } }),
          400: RESPONSES[400],
          403: RESPONSES[403],
        },
      },
    },
    '/profile/onboarding': {
      post: {
        tags: ['Profile'],
        summary: 'Complete onboarding (candidate only; multipart with required resume)',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['phone', 'currentCity', 'employmentStatus', 'resume'],
                properties: {
                  phone: { type: 'string' },
                  currentCity: { type: 'string' },
                  employmentStatus: { type: 'string', enum: ['FRESHER', 'EXPERIENCED'] },
                  resume: {
                    type: 'string',
                    format: 'binary',
                    description: 'PDF/DOC/DOCX, max 5 MB, content-verified (magic bytes)',
                  },
                },
              },
            },
          },
        },
        responses: {
          201: jsonResponse('Onboarded', {
            type: 'object',
            properties: { profile: ref('Profile') },
          }),
          400: errorResponse('Missing/invalid fields, bad file type or spoofed content'),
          403: RESPONSES[403],
        },
      },
    },
    '/profile/resume': {
      post: {
        tags: ['Profile'],
        summary: 'Replace my resume (candidate only; multipart)',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['resume'],
                properties: { resume: { type: 'string', format: 'binary' } },
              },
            },
          },
        },
        responses: {
          200: jsonResponse('Replaced', { type: 'object' }),
          400: RESPONSES[400],
          403: RESPONSES[403],
        },
      },
      get: {
        tags: ['Profile'],
        summary: 'Download my resume (candidate only)',
        responses: {
          200: { description: 'The resume file (attachment)' },
          404: RESPONSES[404],
        },
      },
    },
    '/candidates': {
      get: {
        tags: ['Candidates'],
        summary: 'Search candidates (HR only, case-insensitive filters)',
        parameters: [
          {
            name: 'skills',
            in: 'query',
            schema: { type: 'string' },
            description: 'Comma-separated, matches any skill, case-insensitive',
          },
          { name: 'location', in: 'query', schema: { type: 'string' } },
          { name: 'minExperience', in: 'query', schema: { type: 'integer' } },
          { name: 'maxExperience', in: 'query', schema: { type: 'integer' } },
        ],
        responses: {
          200: jsonResponse('Matching candidates', {
            type: 'object',
            properties: { candidates: { type: 'array', items: ref('Candidate') } },
          }),
          400: RESPONSES[400],
          403: RESPONSES[403],
        },
      },
    },
    '/candidates/{id}/resume': {
      get: {
        tags: ['Candidates'],
        summary: "Download a candidate's resume (HR only)",
        parameters: [idParam],
        responses: {
          200: { description: 'The resume file (attachment)' },
          403: RESPONSES[403],
          404: RESPONSES[404],
        },
      },
    },
    '/notifications': {
      get: {
        tags: ['Meta'],
        summary: 'My latest notifications and unread count',
        responses: {
          200: jsonResponse('Notification feed', {
            type: 'object',
            properties: {
              notifications: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' },
                    message: { type: 'string' },
                    isRead: { type: 'boolean' },
                    createdAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
              unreadCount: { type: 'integer' },
            },
          }),
          401: RESPONSES[401],
        },
      },
    },
    '/notifications/read': {
      post: {
        tags: ['Meta'],
        summary: 'Mark all my notifications as read',
        responses: { 200: jsonResponse('Marked read', { type: 'object' }), 401: RESPONSES[401] },
      },
    },
    '/stats': {
      get: {
        tags: ['Meta'],
        summary: 'Dashboard counters for my jobs (HR only)',
        responses: {
          200: jsonResponse('Stats', { type: 'object', properties: { stats: ref('Stats') } }),
          403: RESPONSES[403],
        },
      },
    },
  },
};

module.exports = openapi;
