import { hashPassword, verifyPassword } from './password.service.js';

describe('password.service', () => {
  it('hashes a password to an argon2id string', async () => {
    const hash = await hashPassword('StrongPass123!');
    expect(hash).toMatch(/^\$argon2id\$/); // argon2id prefix
    expect(hash).not.toBe('StrongPass123!'); // not plaintext
  });

  it('produces different hashes for the same password (unique salt)', async () => {
    const a = await hashPassword('samePassword');
    const b = await hashPassword('samePassword');
    expect(a).not.toBe(b); // salted → different each time
  });

  it('verifies a correct password', async () => {
    const hash = await hashPassword('CorrectPassword1');
    expect(await verifyPassword(hash, 'CorrectPassword1')).toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('CorrectPassword1');
    expect(await verifyPassword(hash, 'WrongPassword2')).toBe(false);
  });

  it('returns false for a malformed hash instead of throwing', async () => {
    // verifyPassword catches argon2.verify errors and returns false
    expect(await verifyPassword('not-a-valid-hash', 'anything')).toBe(false);
  });
});
