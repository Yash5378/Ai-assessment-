const { hashPassword, verifyPassword } = require('../../src/utils/password');

describe('password utils', () => {
  it('hashes a password to something other than the plain text', async () => {
    const hash = await hashPassword('Secret@123');
    expect(hash).not.toBe('Secret@123');
    expect(hash).toMatch(/^\$2[aby]\$/); // bcrypt format
  });

  it('verifies a correct password', async () => {
    const hash = await hashPassword('Secret@123');
    await expect(verifyPassword('Secret@123', hash)).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('Secret@123');
    await expect(verifyPassword('WrongPassword1', hash)).resolves.toBe(false);
  });

  it('produces unique hashes for the same input (random salt)', async () => {
    const [first, second] = await Promise.all([
      hashPassword('Secret@123'),
      hashPassword('Secret@123'),
    ]);
    expect(first).not.toBe(second);
  });
});
