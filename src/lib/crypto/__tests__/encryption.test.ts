import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { encrypt, decrypt, maskApiKey } from '../encryption';

describe('Encryption utilities', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Set up test environment
    process.env = {
      ...originalEnv,
      CLERK_SECRET_KEY: 'test-clerk-secret-key-for-testing-12345',
    };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt strings correctly', () => {
      const plaintext = 'test-api-key-12345';
      
      const encrypted = encrypt(plaintext);
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted.split(':')).toHaveLength(3); // iv:tag:ciphertext format
      
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should produce different encrypted values for the same input', () => {
      const plaintext = 'test-api-key-12345';
      
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);
      
      expect(encrypted1).not.toBe(encrypted2); // Different IVs should produce different results
      
      // But both should decrypt to the same value
      expect(decrypt(encrypted1)).toBe(plaintext);
      expect(decrypt(encrypted2)).toBe(plaintext);
    });

    it('should handle empty strings', () => {
      const plaintext = '';
      
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should handle special characters and unicode', () => {
      const plaintext = 'test-key-with-special-chars-!@#$%^&*()_+-=[]{}|;:,.<>?åäö';
      
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should throw error for invalid encrypted data format', () => {
      expect(() => decrypt('invalid-format')).toThrow('Invalid encrypted data format');
      expect(() => decrypt('only:two:parts')).not.toThrow(); // This should have 3 parts
      expect(() => decrypt('one:two')).toThrow('Invalid encrypted data format');
    });

    it('should throw error for corrupted encrypted data', () => {
      const plaintext = 'test-api-key-12345';
      const encrypted = encrypt(plaintext);
      
      // Corrupt the encrypted data
      const parts = encrypted.split(':');
      const corruptedEncrypted = `${parts[0]}:${parts[1]}:corrupted${parts[2]}`;
      
      expect(() => decrypt(corruptedEncrypted)).toThrow('Decryption failed');
    });
  });

  describe('maskApiKey', () => {
    it('should mask API key correctly', () => {
      const apiKey = 'abcdefghijklmnop1234';
      const result = maskApiKey(apiKey);
      
      expect(result.masked).toBe('****1234');
      expect(result.last4).toBe('1234');
    });

    it('should handle minimum length API key', () => {
      const apiKey = '1234';
      const result = maskApiKey(apiKey);
      
      expect(result.masked).toBe('****1234');
      expect(result.last4).toBe('1234');
    });

    it('should throw error for API key too short', () => {
      expect(() => maskApiKey('123')).toThrow('API key must be at least 4 characters long');
      expect(() => maskApiKey('')).toThrow('API key must be at least 4 characters long');
    });

    it('should handle long API keys', () => {
      const apiKey = 'very-long-api-key-with-many-characters-ending-in-5678';
      const result = maskApiKey(apiKey);
      
      expect(result.masked).toBe('****5678');
      expect(result.last4).toBe('5678');
    });
  });

  describe('environment configuration', () => {
    it('should use ENCRYPTION_KEY when provided', () => {
      // Set a valid 32-byte hex key
      process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      
      const plaintext = 'test-with-custom-key';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should throw error for invalid ENCRYPTION_KEY length', () => {
      process.env.ENCRYPTION_KEY = 'too-short';
      
      expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY must be 64 hex characters');
    });

    it('should throw error when no keys are available', () => {
      delete process.env.ENCRYPTION_KEY;
      delete process.env.CLERK_SECRET_KEY;
      
      expect(() => encrypt('test')).toThrow('Either ENCRYPTION_KEY or CLERK_SECRET_KEY must be set');
    });
  });
});
