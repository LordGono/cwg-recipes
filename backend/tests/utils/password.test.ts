import { describe, it, expect } from 'vitest';
import bcrypt from 'bcrypt';

describe('Password Hashing (bcrypt)', () => {
  const testPassword = 'SecureP@ssw0rd123';
  const saltRounds = 10;

  describe('Hash Generation', () => {
    it('should hash a password', async () => {
      const hash = await bcrypt.hash(testPassword, saltRounds);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash).not.toBe(testPassword);
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should generate different hashes for same password', async () => {
      const hash1 = await bcrypt.hash(testPassword, saltRounds);
      const hash2 = await bcrypt.hash(testPassword, saltRounds);

      // Hashes should be different due to different salts
      expect(hash1).not.toBe(hash2);
    });

    it('should generate different hashes for different passwords', async () => {
      const password1 = 'Password123!';
      const password2 = 'DifferentP@ss456';

      const hash1 = await bcrypt.hash(password1, saltRounds);
      const hash2 = await bcrypt.hash(password2, saltRounds);

      expect(hash1).not.toBe(hash2);
    });

    it('should hash empty string (edge case)', async () => {
      const hash = await bcrypt.hash('', saltRounds);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });
  });

  describe('Password Comparison', () => {
    it('should verify correct password', async () => {
      const hash = await bcrypt.hash(testPassword, saltRounds);
      const isMatch = await bcrypt.compare(testPassword, hash);

      expect(isMatch).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const hash = await bcrypt.hash(testPassword, saltRounds);
      const wrongPassword = 'WrongP@ssw0rd123';
      const isMatch = await bcrypt.compare(wrongPassword, hash);

      expect(isMatch).toBe(false);
    });

    it('should be case-sensitive', async () => {
      const password = 'CaseSensitive123';
      const hash = await bcrypt.hash(password, saltRounds);

      const correctCase = await bcrypt.compare('CaseSensitive123', hash);
      const wrongCase = await bcrypt.compare('casesensitive123', hash);

      expect(correctCase).toBe(true);
      expect(wrongCase).toBe(false);
    });

    it('should handle whitespace correctly', async () => {
      const passwordWithSpace = 'Pass Word 123';
      const hash = await bcrypt.hash(passwordWithSpace, saltRounds);

      const withSpace = await bcrypt.compare('Pass Word 123', hash);
      const withoutSpace = await bcrypt.compare('PassWord123', hash);

      expect(withSpace).toBe(true);
      expect(withoutSpace).toBe(false);
    });

    it('should reject completely wrong password', async () => {
      const hash = await bcrypt.hash(testPassword, saltRounds);
      const isMatch = await bcrypt.compare('CompletelyWrong', hash);

      expect(isMatch).toBe(false);
    });
  });

  describe('Security Properties', () => {
    it('should not expose original password in hash', async () => {
      const password = 'MySuperSecretPassword123!';
      const hash = await bcrypt.hash(password, saltRounds);

      expect(hash).not.toContain(password);
      expect(hash).not.toContain('MySuperSecret');
    });

    it('should use sufficient salt rounds', async () => {
      const hash = await bcrypt.hash(testPassword, saltRounds);

      // bcrypt hashes start with $2a$ or $2b$ followed by cost
      expect(hash.startsWith('$2')).toBe(true);

      // Extract cost from hash (format: $2a$10$...)
      const cost = parseInt(hash.split('$')[2]);
      expect(cost).toBeGreaterThanOrEqual(10);
    });

    it('should handle special characters in password', async () => {
      const specialPasswords = [
        'P@ssw0rd!',
        'T€st#123',
        'C0mpl€x$Pass',
        '!@#$%^&*()',
      ];

      for (const password of specialPasswords) {
        const hash = await bcrypt.hash(password, saltRounds);
        const isMatch = await bcrypt.compare(password, hash);

        expect(isMatch).toBe(true);
      }
    });

    it('should handle unicode characters', async () => {
      const unicodePasswords = [
        'Pässwörd123',
        '密码123',
        'パスワード123',
      ];

      for (const password of unicodePasswords) {
        const hash = await bcrypt.hash(password, saltRounds);
        const isMatch = await bcrypt.compare(password, hash);

        expect(isMatch).toBe(true);
      }
    });
  });

  describe('Performance and Consistency', () => {
    it('should consistently verify the same hash', async () => {
      const hash = await bcrypt.hash(testPassword, saltRounds);

      // Verify multiple times
      const results = await Promise.all([
        bcrypt.compare(testPassword, hash),
        bcrypt.compare(testPassword, hash),
        bcrypt.compare(testPassword, hash),
      ]);

      expect(results.every((result) => result === true)).toBe(true);
    });

    it('should handle very long passwords', async () => {
      const longPassword = 'A'.repeat(100) + '!1aB';
      const hash = await bcrypt.hash(longPassword, saltRounds);
      const isMatch = await bcrypt.compare(longPassword, hash);

      expect(isMatch).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle single character password', async () => {
      const singleChar = 'A';
      const hash = await bcrypt.hash(singleChar, saltRounds);
      const isMatch = await bcrypt.compare(singleChar, hash);

      expect(isMatch).toBe(true);
    });

    it('should handle numeric-only password', async () => {
      const numericPassword = '123456789';
      const hash = await bcrypt.hash(numericPassword, saltRounds);
      const isMatch = await bcrypt.compare(numericPassword, hash);

      expect(isMatch).toBe(true);
    });

    it('should reject empty string comparison against valid hash', async () => {
      const hash = await bcrypt.hash(testPassword, saltRounds);
      const isMatch = await bcrypt.compare('', hash);

      expect(isMatch).toBe(false);
    });
  });
});
