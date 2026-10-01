import argon2 from 'argon2';
import bcrypt from 'bcryptjs';

export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  verify(hash: string, plain: string): Promise<boolean>;
}

/**
 * Argon2id (OWASP recommended parameters) by default, bcrypt as a configurable alternative.
 * Verification detects the algorithm from the stored hash, so switching PASSWORD_HASHER
 * never locks out existing users.
 */
export function createPasswordHasher(kind: 'argon2id' | 'bcrypt', fast = false): PasswordHasher {
  return {
    async hash(plain) {
      if (kind === 'bcrypt') return bcrypt.hash(plain, fast ? 4 : 12);
      return argon2.hash(plain, {
        type: argon2.argon2id,
        memoryCost: fast ? 1024 : 19456,
        timeCost: fast ? 1 : 2,
        parallelism: 1,
      });
    },
    async verify(hash, plain) {
      try {
        if (hash.startsWith('$argon2')) return await argon2.verify(hash, plain);
        if (hash.startsWith('$2')) return await bcrypt.compare(plain, hash);
        return false;
      } catch {
        return false;
      }
    },
  };
}

/** A pre-computed hash used to equalise timing when the account does not exist. */
export const DUMMY_HASH = '$2a$10$CwTycUXWue0Thq9StjUM0uJ8.m7qT9ZcU6W2yYtVlm9vP0p6uYl2e';
