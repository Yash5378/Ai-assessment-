const {
  registerSchema,
  createJobSchema,
  updateJobSchema,
  createApplicationSchema,
  idParamSchema,
} = require('../../src/validation/schemas');

describe('registerSchema', () => {
  const valid = { name: 'Jane Doe', email: 'jane@example.com', password: 'Passw0rd' };

  it('accepts a valid payload', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
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

  it('rejects a missing name', () => {
    const { name, ...rest } = valid;
    expect(registerSchema.safeParse(rest).success).toBe(false);
  });
});

describe('job schemas', () => {
  const validJob = {
    title: 'Backend Engineer',
    description: 'Build and maintain our REST APIs.',
    location: 'Remote',
    employmentType: 'FULL_TIME',
  };

  it('accepts a valid job without optional salary', () => {
    expect(createJobSchema.safeParse(validJob).success).toBe(true);
  });

  it('rejects an unknown employment type', () => {
    expect(createJobSchema.safeParse({ ...validJob, employmentType: 'GIG' }).success).toBe(false);
  });

  it('rejects a too-short description', () => {
    expect(createJobSchema.safeParse({ ...validJob, description: 'short' }).success).toBe(false);
  });

  it('treats an empty salary string as undefined', () => {
    const result = createJobSchema.parse({ ...validJob, salaryRange: '' });
    expect(result.salaryRange).toBeUndefined();
  });

  it('update requires at least one field', () => {
    expect(updateJobSchema.safeParse({}).success).toBe(false);
    expect(updateJobSchema.safeParse({ status: 'CLOSED' }).success).toBe(true);
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
