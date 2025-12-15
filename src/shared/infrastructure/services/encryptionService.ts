import CryptoJS from 'crypto-js';

/**
 * Encryption Service
 * Provides AES-256 encryption for sensitive data and password hashing
 */

/**
 * Encrypt plaintext using AES-256
 * @param plainText - Text to encrypt
 * @param password - Encryption password
 * @returns Base64 encoded encrypted string
 */
export function encrypt(plainText: string, password: string): string {
    return CryptoJS.AES.encrypt(plainText, password).toString();
}

/**
 * Decrypt ciphertext using AES-256
 * @param cipherText - Encrypted text (base64)
 * @param password - Decryption password
 * @returns Decrypted plaintext
 * @throws Error if decryption fails (wrong password)
 */
export function decrypt(cipherText: string, password: string): string {
    try {
        const bytes = CryptoJS.AES.decrypt(cipherText, password);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);

        if (!decrypted) {
            throw new Error('Decryption failed - invalid password');
        }

        return decrypted;
    } catch (error) {
        throw new Error('Decryption failed - invalid password or corrupted data');
    }
}

/**
 * Hash password using SHA-256
 * @param password - Password to hash
 * @returns Hashed password (hex string)
 */
export function hashPassword(password: string): string {
    return CryptoJS.SHA256(password).toString();
}

/**
 * Verify password against hash
 * @param password - Password to verify
 * @param hash - Expected hash
 * @returns true if password matches hash
 */
export function verifyPassword(password: string, hash: string): boolean {
    const passwordHash = hashPassword(password);
    return passwordHash === hash;
}
