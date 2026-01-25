import CryptoJS from 'crypto-js';

/**
 * Decrypt ciphertext using AES-256 (compatible with Client)
 */
export const decrypt = (cipherText: string, secret: string): string => {
    try {
        const bytes = CryptoJS.AES.decrypt(cipherText, secret);
        const originalText = bytes.toString(CryptoJS.enc.Utf8);
        if (!originalText) throw new Error('Decryption failed');
        return originalText;
    } catch (error) {
        throw new Error('Decryption failed');
    }
};

/**
 * Encrypt plaintext using AES-256 (compatible with Client)
 */
export const encrypt = (plainText: string, secret: string): string => {
    return CryptoJS.AES.encrypt(plainText, secret).toString();
};
