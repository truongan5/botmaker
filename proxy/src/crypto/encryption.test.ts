import { describe, it, expect } from 'vitest';
import { randomBytes } from 'crypto';
import { encrypt, decrypt, hashToken, generateToken } from './encryption.js';

describe('encryption', () => {
  const masterKey = randomBytes(32);

  describe('encrypt/decrypt roundtrip', () => {
    it('should encrypt and decrypt text correctly', () => {
      const plaintext = 'my-secret-api-key-12345';
      const ciphertext = encrypt(plaintext, masterKey);
      const decrypted = decrypt(ciphertext, masterKey);
      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt empty string', () => {
      const plaintext = '';
      const ciphertext = encrypt(plaintext, masterKey);
      const decrypted = decrypt(ciphertext, masterKey);
      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt unicode text', () => {
      const plaintext = 'secret-key-with-emoji-🔑';
      const ciphertext = encrypt(plaintext, masterKey);
      const decrypted = decrypt(ciphertext, masterKey);
      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt long text', () => {
      const plaintext = 'a'.repeat(10000);
      const ciphertext = encrypt(plaintext, masterKey);
      const decrypted = decrypt(ciphertext, masterKey);
      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext for same plaintext (IV randomization)', () => {
      const plaintext = 'same-plaintext';
      const ciphertext1 = encrypt(plaintext, masterKey);
      const ciphertext2 = encrypt(plaintext, masterKey);
      expect(ciphertext1.equals(ciphertext2)).toBe(false);
    });

    it('should fail decryption with wrong key', () => {
      const plaintext = 'my-secret';
      const ciphertext = encrypt(plaintext, masterKey);
      const wrongKey = randomBytes(32);
      expect(() => decrypt(ciphertext, wrongKey)).toThrow();
    });

    it('should fail decryption with tampered ciphertext', () => {
      const plaintext = 'my-secret';
      const ciphertext = encrypt(plaintext, masterKey);
      // Tamper with the auth tag
      ciphertext[15] ^= 0xff;
      expect(() => decrypt(ciphertext, masterKey)).toThrow();
    });
  });

  describe('hashToken', () => {
    it('should produce deterministic hash for same input', () => {
      const token = 'my-bot-token-12345';
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);
      expect(hash1).toBe(hash2);
    });

    it('should produce different hash for different input', () => {
      const hash1 = hashToken('token-1');
      const hash2 = hashToken('token-2');
      expect(hash1).not.toBe(hash2);
    });

    it('should produce 64-character hex string (SHA-256)', () => {
      const hash = hashToken('any-token');
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should hash empty string', () => {
      const hash = hashToken('');
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('generateToken', () => {
    it('should generate 64-character hex string', () => {
      const token = generateToken();
      expect(token).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should generate unique tokens', () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateToken());
      }
      expect(tokens.size).toBe(100);
    });

    it('should generate cryptographically random tokens', () => {
      const token1 = generateToken();
      const token2 = generateToken();
      expect(token1).not.toBe(token2);
    });
  });
});
