const {
  registerSchema,
  createJobSchema,
  updateJobSchema,
  jobSearchSchema,
  createApplicationSchema,
  candidateSearchSchema,
  onboardingSchema,
  profileSchema,
  idParamSchema,
} = require('../../src/validation/schemas');

describe('registerSchema', () => {
  const valid = { name: 'Jane Doe', email: 'jane@example.com', password: 'Passw0rd' };

  it('accepts a valid payload and defaults the role to CANDIDATE', () => {
    const result = registerSchema.parse(valid);
    expect(result.role).toBe('CANDIDATE');
  });

  it('accepts an explicit HR role', () => {
    expect(registerSchema.parse({ ...valid, role: 'HR' }).role).toBe('HR');
  });

  it('rejects roles outside the whitelist (no privilege escalation)', () => {
    expect(registerSchema.safeParse({ ...valid, role: 'ADMIN' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...valid, role: 'SUPERUSER' }).success).toBe(false);
  });

  it('normalizes email to lowercase and trims name', () => {
    const result = registerSchema.parse({ ...valid, email: '  JANE@Example.COM ', name: ' Jane ' });
    expect(result.email).toBe('jane@example.com');
    expect(result.name).toBe('Jane');
  });

  it.each([
    ['too short', 'Pw1a'],
    ['no uppercase', 'password1'],
    ['no lowercase', 'PASSWORD1'],
    ['no number', 'Password'],
  ])('rejects a weak password (%s)', (_label, password) => {
    expect(registerSchema.safeParse({ ...valid, password }).success).toBe(false);
  });

  it('rejects an invalid email', () => {
    expect(registerSchema.safeParse({ ...valid, email: 'not-an-email' }).success).toBe(false);
  });
});

describe('job schemas', () => {
  const validJob = {
    title: 'Backend Engineer',
    company: 'SkyPoint Cloud',
    description: 'Build and maintain our REST APIs.',
    location: 'Remote',
    employmentType: 'FULL_TIME',
    skills: ['Node.js', 'PostgreSQL'],
    experienceMin: 2,
  };

  it('accepts a valid job and normalizes skills to lowercase', () => {
    const result = createJobSchema.parse(validJob);
    expect(result.skills).toEqual(['node.js', 'postgresql']);
  });

  it('deduplicates skills after normalization', () => {
    const result = createJobSchema.parse({ ...validJob, skills: ['React', ' react ', 'REACT'] });
    expect(result.skills).toEqual(['react']);
  });

  it('requires at least one skill', () => {
    expect(createJobSchema.safeParse({ ...validJob, skills: [] }).success).toBe(false);
  });

  it('rejects an unknown employment type', () => {
    expect(createJobSchema.safeParse({ ...validJob, employmentType: 'GIG' }).success).toBe(false);
  });

  it('rejects experienceMin greater than experienceMax', () => {
    expect(
      createJobSchema.safeParse({ ...validJob, experienceMin: 8, experienceMax: 3 }).success
    ).toBe(false);
  });

  it('rejects salaryMin greater than salaryMax', () => {
    expect(createJobSchema.safeParse({ ...validJob, salaryMin: 40, salaryMax: 20 }).success).toBe(
      false
    );
  });

  it('accepts a well-ordered salary range', () => {
    const result = createJobSchema.parse({ ...validJob, salaryMin: 20, salaryMax: 40 });
    expect(result.salaryMin).toBe(20);
    expect(result.salaryMax).toBe(40);
  });

  it('update requires at least one field', () => {
    expect(updateJobSchema.safeParse({}).success).toBe(false);
    expect(updateJobSchema.safeParse({ status: 'CLOSED' }).success).toBe(true);
  });
});

describe('jobSearchSchema (query params)', () => {
  it('parses comma-separated skills into a normalized array', () => {
    const result = jobSearchSchema.parse({ skills: ' React, NODE.js ,react ' });
    expect(result.skills).toEqual(['react', 'node.js']);
  });

  it('coerces numeric params from query strings', () => {
    const result = jobSearchSchema.parse({ maxExperience: '5', minSalary: '20' });
    expect(result.maxExperience).toBe(5);
    expect(result.minSalary).toBe(20);
  });

  it('treats empty strings as missing filters', () => {
    const result = jobSearchSchema.parse({ title: '  ', company: '' });
    expect(result.title).toBeUndefined();
    expect(result.company).toBeUndefined();
  });

  it('rejects a non-numeric experience filter', () => {
    expect(jobSearchSchema.safeParse({ maxExperience: 'lots' }).success).toBe(false);
  });
});

describe('onboardingSchema', () => {
  const valid = { phone: '+91 98765 43210', currentCity: 'Mumbai', employmentStatus: 'EXPERIENCED' };

  it('accepts valid onboarding info', () => {
    expect(onboardingSchema.safeParse(valid).success).toBe(true);
  });

  it.each([['abc'], ['12'], ['++9999']])('rejects an invalid phone %p', (phone) => {
    expect(onboardingSchema.safeParse({ ...valid, phone }).success).toBe(false);
  });

  it('rejects an unknown employment status', () => {
    expect(onboardingSchema.safeParse({ ...valid, employmentStatus: 'INTERN' }).success).toBe(false);
  });

  it('rejects a too-short city', () => {
    expect(onboardingSchema.safeParse({ ...valid, currentCity: 'x' }).success).toBe(false);
  });
});

describe('profileSchema', () => {
  it('applies defaults for an empty payload', () => {
    const result = profileSchema.parse({});
    expect(result).toMatchObject({
      headline: '',
      skills: [],
      experienceYears: 0,
      employmentStatus: 'FRESHER',
      currentCompany: '',
    });
    expect(result.currentCtc).toBeNull();
    expect(result.expectedCtc).toBeNull();
    expect(result.noticePeriod).toBeNull();
  });

  it('normalizes skills and coerces CTC numbers', () => {
    const result = profileSchema.parse({
      skills: [' React ', 'CSS'],
      experienceYears: '3',
      currentCtc: '14',
      expectedCtc: '18',
    });
    expect(result.skills).toEqual(['react', 'css']);
    expect(result.experienceYears).toBe(3);
    expect(result.currentCtc).toBe(14);
    expect(result.expectedCtc).toBe(18);
  });

  it('clears an empty CTC to null', () => {
    expect(profileSchema.parse({ expectedCtc: '' }).expectedCtc).toBeNull();
  });

  it('accepts a valid notice period and rejects an invalid one', () => {
    expect(profileSchema.parse({ noticePeriod: '30_DAYS' }).noticePeriod).toBe('30_DAYS');
    expect(profileSchema.safeParse({ noticePeriod: 'SOON' }).success).toBe(false);
  });

  it('rejects negative experience', () => {
    expect(profileSchema.safeParse({ experienceYears: -1 }).success).toBe(false);
  });
});

describe('candidateSearchSchema', () => {
  it('parses filters from query strings', () => {
    const result = candidateSearchSchema.parse({ skills: 'react,sql', minExperience: '2' });
    expect(result.skills).toEqual(['react', 'sql']);
    expect(result.minExperience).toBe(2);
  });
});

describe('createApplicationSchema', () => {
  it('rejects a cover letter under 20 characters', () => {
    expect(createApplicationSchema.safeParse({ coverLetter: 'too short' }).success).toBe(false);
  });

  it('accepts a reasonable cover letter', () => {
    expect(
      createApplicationSchema.safeParse({
        coverLetter: 'I am very excited to apply for this position because…',
      }).success
    ).toBe(true);
  });
});

describe('idParamSchema', () => {
  it('coerces numeric strings from the URL', () => {
    expect(idParamSchema.parse({ id: '17' }).id).toBe(17);
  });

  it.each([['abc'], ['-1'], ['1.5'], ['']])('rejects invalid id %p', (id) => {
    expect(idParamSchema.safeParse({ id }).success).toBe(false);
  });
});
