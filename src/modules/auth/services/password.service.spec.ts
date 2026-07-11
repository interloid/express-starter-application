import { hashPassword, verifyPassword } from './password.service.js';
import { describe, it, expect } from '@jest/globals';

describe('Password Utils', () => {
  describe('hashPassword', () => {
    it('should hash the password', async () => {
      const plain = 'Password@123';

      const hash = await hashPassword(plain);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(plain);
      expect(hash.startsWith('$argon2id$')).toBe(true);
    });

    it('should generate different hashes for the same password', async () => {
      const plain = 'Password@123';

      const hash1 = await hashPassword(plain);
      const hash2 = await hashPassword(plain);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('should return true for a valid password', async () => {
      const plain = 'Password@123';
      const hash = await hashPassword(plain);

      const result = await verifyPassword(hash, plain);

      expect(result).toBe(true);
    });

    it('should return false for an invalid password', async () => {
      const plain = 'Password@123';
      const hash = await hashPassword(plain);

      const result = await verifyPassword(hash, 'WrongPassword');

      expect(result).toBe(false);
    });

    it('should return false for an invalid hash', async () => {
      const result = await verifyPassword('invalid-hash', 'Password@123');

      expect(result).toBe(false);
    });

    it('should return false for an empty hash', async () => {
      const result = await verifyPassword('', 'Password@123');

      expect(result).toBe(false);
    });
  });
});
