import crypto from 'node:crypto';
import { config } from '../../config/index.js';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits

function getEncryptionKey(): Buffer {
    // Derive a 256-bit key from the JWT secret (or a dedicated INTEGRATION_ENCRYPTION_KEY)
    const secret = process.env.INTEGRATION_ENCRYPTION_KEY || config.jwt.accessSecret;
    return crypto.scryptSync(secret, 'electis-integration-salt', KEY_LENGTH);
}

export function encryptCredentials(plaintext: string): {
    encrypted: string;
    iv: string;
    tag: string;
} {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag();

    return {
        encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
    };
}

export function decryptCredentials(encrypted: string, iv: string, tag: string): string {
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv(
        ALGORITHM,
        key,
        Buffer.from(iv, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(tag, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
