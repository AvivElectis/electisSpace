import crypto from 'crypto';

/**
 * Encryption utilities using Node.js native crypto
 * Uses AES-256-GCM for authenticated encryption
 *
 * Format: base64(iv + authTag + ciphertext)
 * - IV: 12 bytes (96 bits) - GCM recommended
 * - Auth Tag: 16 bytes (128 bits)
 * - Ciphertext: variable
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM recommended IV size
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32; // 256 bits

/**
 * Derive a 256-bit key from a password/secret
 * Uses PBKDF2 with a static salt (for deterministic key derivation)
 * In production, consider using a stored salt per encryption context
 */
const deriveKey = (secret: string): Buffer => {
    // Use a fixed salt for deterministic key derivation
    // This allows the same secret to always produce the same key
    const salt = Buffer.from('electisspace-encryption-salt-v1', 'utf8');
    return crypto.pbkdf2Sync(secret, salt, 100000, KEY_LENGTH, 'sha256');
};

/**
 * Encrypt plaintext using AES-256-GCM
 * Returns: base64(iv + authTag + ciphertext)
 */
export const encrypt = (plainText: string, secret: string): string => {
    const key = deriveKey(secret);
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(plainText, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    const authTag = cipher.getAuthTag();
    
    // Combine: IV + AuthTag + Ciphertext
    const combined = Buffer.concat([iv, authTag, encrypted]);
    
    return combined.toString('base64');
};

/**
 * Decrypt ciphertext - auto-detects format (new GCM or legacy CryptoJS)
 * For new format: expects base64(iv + authTag + ciphertext)
 * For legacy: expects CryptoJS OpenSSL format
 */
export const decrypt = (cipherText: string, secret: string): string => {
    try {
        const combined = Buffer.from(cipherText, 'base64');
        
        // Check for CryptoJS "Salted__" prefix (OpenSSL format)
        const prefix = combined.subarray(0, 8).toString('utf8');
        if (prefix === 'Salted__') {
            return decryptLegacyCryptoJS(cipherText, secret);
        }
        
        // Try new GCM format
        return decryptGCM(cipherText, secret);
    } catch (error) {
        // If GCM fails, try legacy as fallback
        try {
            return decryptLegacyCryptoJS(cipherText, secret);
        } catch {
            throw new Error('Decryption failed');
        }
    }
};

/**
 * Decrypt using AES-256-GCM (new format)
 */
const decryptGCM = (cipherText: string, secret: string): string => {
    const key = deriveKey(secret);
    const combined = Buffer.from(cipherText, 'base64');
    
    if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
        throw new Error('Invalid ciphertext: too short');
    }
    
    // Extract components
    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString('utf8');
};

/**
 * Decrypt CryptoJS OpenSSL format (legacy)
 */
const decryptLegacyCryptoJS = (cipherText: string, secret: string): string => {
    const data = Buffer.from(cipherText, 'base64');
    
    // CryptoJS OpenSSL format: "Salted__" + 8-byte salt + ciphertext
    const prefix = data.subarray(0, 8).toString('utf8');
    if (prefix !== 'Salted__') {
        throw new Error('Invalid legacy ciphertext format');
    }
    
    const salt = data.subarray(8, 16);
    const encrypted = data.subarray(16);
    
    // Derive key and IV using MD5 (CryptoJS default EVP_BytesToKey)
    const keyIv = evpBytesToKey(secret, salt, 32, 16);
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', keyIv.key, keyIv.iv);
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString('utf8');
};

/**
 * OpenSSL EVP_BytesToKey key derivation (for legacy CryptoJS support)
 * This mimics what CryptoJS uses by default
 */
const evpBytesToKey = (
    password: string,
    salt: Buffer,
    keyLen: number,
    ivLen: number
): { key: Buffer; iv: Buffer } => {
    const passwordBuffer = Buffer.from(password, 'utf8');
    const totalLen = keyLen + ivLen;
    const result: Buffer[] = [];
    let resultLen = 0;
    let prevBlock = Buffer.alloc(0);
    
    while (resultLen < totalLen) {
        const hash = crypto.createHash('md5');
        hash.update(prevBlock);
        hash.update(passwordBuffer);
        hash.update(salt);
        prevBlock = hash.digest();
        result.push(prevBlock);
        resultLen += prevBlock.length;
    }
    
    const derived = Buffer.concat(result);
    return {
        key: derived.subarray(0, keyLen),
        iv: derived.subarray(keyLen, keyLen + ivLen),
    };
};

/**
 * Re-encrypt legacy CryptoJS data with new format
 * Call this to migrate existing encrypted data
 */
export const migrateEncryption = (
    legacyCipherText: string,
    secret: string
): string => {
    // decrypt auto-detects format
    const plainText = decrypt(legacyCipherText, secret);
    return encrypt(plainText, secret);
};

