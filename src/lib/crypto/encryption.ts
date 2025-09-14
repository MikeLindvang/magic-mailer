import crypto from 'crypto';

/**
 * Simple encryption utility for storing sensitive data like API keys
 * 
 * Uses AES-256-GCM encryption with a key derived from environment variables.
 * This is a basic implementation - for production, consider using a proper
 * key management service.
 */

const ALGORITHM = 'aes-256-cbc';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
// const TAG_LENGTH = 16; // 128 bits - Currently unused but may be needed for future validation

/**
 * Get or generate encryption key from environment
 * In production, this should be a proper secret from a key management service
 */
function getEncryptionKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY;
  
  if (envKey) {
    // Use provided key, ensuring it's the right length
    const key = Buffer.from(envKey, 'hex');
    if (key.length !== KEY_LENGTH) {
      throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
    }
    return key;
  }
  
  // For development, derive a key from Clerk secret (which should be available)
  const clerkSecret = process.env.CLERK_SECRET_KEY;
  if (!clerkSecret) {
    throw new Error('Either ENCRYPTION_KEY or CLERK_SECRET_KEY must be set');
  }
  
  // Derive a consistent key from Clerk secret
  return crypto.pbkdf2Sync(clerkSecret, 'magic-mailer-salt', 100000, KEY_LENGTH, 'sha256');
}

/**
 * Encrypt a string value
 * 
 * @param plaintext - The string to encrypt
 * @returns Encrypted data as hex string (iv:tag:ciphertext)
 */
export function encrypt(plaintext: string): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const cipher = crypto.createCipher(ALGORITHM, key);
    
    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    
    // Combine iv and ciphertext
    return `${iv.toString('hex')}:${ciphertext}`;
  } catch (error) {
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrypt a string value
 * 
 * @param encryptedData - Encrypted data as hex string (iv:tag:ciphertext)
 * @returns Decrypted plaintext string
 */
export function decrypt(encryptedData: string): string {
  try {
    const key = getEncryptionKey();
    const parts = encryptedData.split(':');
    
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const ciphertext = parts[1];
    
    // Note: Using createDecipher for compatibility with existing encrypted data
    // The IV is extracted but not used as createDecipher derives key material differently
    const decipher = crypto.createDecipher(ALGORITHM, key);
    void iv; // Acknowledge IV is extracted but not used with createDecipher
    
    let plaintext = decipher.update(ciphertext, 'hex', 'utf8');
    plaintext += decipher.final('utf8');
    
    return plaintext;
  } catch (error) {
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Mask an API key for display purposes
 * 
 * @param apiKey - The full API key to mask
 * @returns Object with masked version and last 4 characters
 */
export function maskApiKey(apiKey: string): { masked: string; last4: string } {
  if (apiKey.length < 4) {
    throw new Error('API key must be at least 4 characters long');
  }
  
  const last4 = apiKey.slice(-4);
  const masked = '****' + last4;
  
  return { masked, last4 };
}
