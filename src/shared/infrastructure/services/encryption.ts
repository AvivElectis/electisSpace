/**
 * Encryption Service
 * AES-256-CBC encryption for SFTP credentials
 * 
 * Used to encrypt sensitive data before sending to SFTP API
 */

import CryptoJS from 'crypto-js';
import { logger } from './logger';

/**
 * Encryption key for SFTP API communication
 * This key is used to encrypt credentials before sending to the server
 */
const ENCRYPTION_KEY = import.meta.env.VITE_SFTP_ENCRYPTION_KEY || '';

const IV_LENGTH = 16;

/**
 * Encrypt a string using AES-256-CBC
 * 
 * @param text - Plain text to encrypt
 * @returns Encrypted string in format "iv:encryptedData"
 */
export function encrypt(text: string): string {
    if (!ENCRYPTION_KEY) {
        logger.error('Encryption', 'Encryption key not configured');
        throw new Error('Encryption key not configured. Set VITE_SFTP_ENCRYPTION_KEY in .env');
    }

    try {
        // Generate random IV
        const iv = CryptoJS.lib.WordArray.random(IV_LENGTH);
        const key = CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY);

        // Encrypt using AES-256-CBC
        const encrypted = CryptoJS.AES.encrypt(text, key, {
            iv: iv,
            padding: CryptoJS.pad.Pkcs7,
            mode: CryptoJS.mode.CBC,
        });

        // Combine IV and encrypted text
        const ivHex = iv.toString(CryptoJS.enc.Hex);
        const encryptedText = encrypted.toString();

        logger.debug('Encryption', 'Text encrypted successfully');
        return `${ivHex}:${encryptedText}`;
    } catch (error) {
        logger.error('Encryption', 'Encryption failed', { error });
        throw new Error('Encryption failed');
    }
}

/**
 * Decrypt a string using AES-256-CBC
 * 
 * @param text - Encrypted string in format "iv:encryptedData"
 * @returns Decrypted plain text
 */
export function decrypt(text: string): string {
    if (!ENCRYPTION_KEY) {
        logger.error('Encryption', 'Encryption key not configured');
        throw new Error('Encryption key not configured. Set VITE_SFTP_ENCRYPTION_KEY in .env');
    }

    try {
        // Split IV and encrypted text
        const textParts = text.split(':');
        if (textParts.length !== 2) {
            throw new Error('Invalid encrypted text format');
        }

        const iv = CryptoJS.enc.Hex.parse(textParts[0]);
        const encryptedText = textParts[1];
        const key = CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY);

        // Decrypt using AES-256-CBC
        const decrypted = CryptoJS.AES.decrypt(encryptedText, key, {
            iv: iv,
            padding: CryptoJS.pad.Pkcs7,
            mode: CryptoJS.mode.CBC,
        });

        const result = decrypted.toString(CryptoJS.enc.Utf8);
        
        if (!result) {
            throw new Error('Decryption produced empty result');
        }

        logger.debug('Encryption', 'Text decrypted successfully');
        return result;
    } catch (error) {
        logger.error('Encryption', 'Decryption failed', { error });
        throw new Error('Decryption failed');
    }
}

/**
 * Check if encryption is properly configured
 * 
 * @returns true if encryption key is set
 */
export function isEncryptionConfigured(): boolean {
    return !!ENCRYPTION_KEY && ENCRYPTION_KEY.length === 32;
}
