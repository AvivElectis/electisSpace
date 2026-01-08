/**
 * SFTP API Client
 * HTTP client for communicating with the SFTP proxy API at solum.co.il/sftp
 * 
 * All credentials are encrypted using AES-256-CBC before transmission
 */

import { encrypt } from './encryption';
import { logger } from './logger';

/**
 * SFTP API Base URL
 */
const API_BASE_URL = 'https://solum.co.il/sftp';

/**
 * SFTP API Bearer Token
 */
const API_TOKEN = import.meta.env.VITE_SFTP_API_TOKEN || 'SFTP_APi_T0k3n_2025_c0mpl3x_S3cur3_P3rm4n3nt_K3y_X9zQ7mN5bR8wF2vH4pL';

/**
 * SFTP Credentials interface
 */
export interface SFTPCredentials {
    username: string;
    password: string;
    remoteFilename: string;
    host?: string;
    port?: number;
}

/**
 * Directory tree item from SFTP
 */
export interface SFTPDirectoryItem {
    name: string;
    type: 'file' | 'directory';
    size?: number;
    modifiedAt?: string;
}

/**
 * SFTP API response types
 */
export interface SFTPFileResponse {
    success: boolean;
    content?: string;
    error?: string;
}

export interface SFTPConnectionTestResult {
    success: boolean;
    message: string;
    error?: string;
    data?: unknown;
}

/**
 * Get authorization headers
 */
function getHeaders(includeContentType = true): Record<string, string> {
    const headers: Record<string, string> = {
        'Authorization': `Bearer ${API_TOKEN}`,
    };

    if (includeContentType) {
        headers['Content-Type'] = 'application/json';
    }

    return headers;
}

/**
 * Test connection to SFTP server
 * Fetches directory tree to verify credentials work
 * 
 * @param creds - SFTP credentials
 * @returns true if connection successful
 */
export async function testConnection(creds: SFTPCredentials): Promise<boolean> {
    logger.startTimer('sftp-test-connection');
    logger.info('SFTP', 'Testing connection', { username: creds.username });

    try {
        const encryptedUsername = encrypt(creds.username);
        const encryptedPassword = encrypt(creds.password);

        const response = await fetch(`${API_BASE_URL}/fetch`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({
                username: encryptedUsername,
                password: encryptedPassword,
            }),
        });

        const duration = logger.endTimer('sftp-test-connection', 'SFTP', 'Connection test completed');

        if (!response.ok) {
            logger.error('SFTP', 'Connection test failed', { status: response.status });
            return false;
        }

        logger.info('SFTP', 'Connection test successful', { duration });
        return true;

    } catch (error: unknown) {
        logger.endTimer('sftp-test-connection', 'SFTP', 'Connection test failed');
        const err = error as { message?: string };
        logger.error('SFTP', 'Connection test failed', { error: err?.message || 'Unknown error' });
        throw new Error(err?.message || 'Connection test failed');
    }
}

/**
 * Download a file from SFTP server
 * 
 * @param creds - SFTP credentials
 * @returns File content as string
 */
export async function downloadFile(creds: SFTPCredentials): Promise<string> {
    logger.startTimer('sftp-download');
    logger.info('SFTP', 'Downloading file', { filename: creds.remoteFilename });

    try {
        const encryptedUsername = encrypt(creds.username);
        const encryptedPassword = encrypt(creds.password);
        const encryptedFilename = encrypt(creds.remoteFilename);

        const params = new URLSearchParams({
            username: encryptedUsername,
            password: encryptedPassword,
            filename: encryptedFilename,
        });

        const response = await fetch(`${API_BASE_URL}/file?${params}`, {
            method: 'GET',
            headers: getHeaders(false),
        });

        if (!response.ok) {
            logger.endTimer('sftp-download', 'SFTP', 'Download failed');
            throw new Error(`Download failed: HTTP ${response.status}`);
        }

        const content = await response.text();
        const duration = logger.endTimer('sftp-download', 'SFTP', 'File downloaded');
        
        logger.info('SFTP', 'Download successful', { 
            duration,
            size: content.length,
            filename: creds.remoteFilename 
        });
        
        return content;

    } catch (error: unknown) {
        logger.endTimer('sftp-download', 'SFTP', 'Download failed');
        throw error;
    }
}

/**
 * Upload a file to SFTP server
 * 
 * @param creds - SFTP credentials
 * @param content - File content to upload
 */
export async function uploadFile(creds: SFTPCredentials, content: string): Promise<void> {
    logger.startTimer('sftp-upload');
    logger.info('SFTP', 'Uploading file', { 
        filename: creds.remoteFilename,
        size: content.length,
    });

    try {
        const encryptedUsername = encrypt(creds.username);
        const encryptedPassword = encrypt(creds.password);
        const encryptedFilename = encrypt(creds.remoteFilename);

        const formData = new FormData();
        const blob = new Blob([content], { type: 'text/plain' });
        formData.append('file', blob, creds.remoteFilename);
        formData.append('username', encryptedUsername);
        formData.append('password', encryptedPassword);
        formData.append('filename', encryptedFilename);

        const response = await fetch(`${API_BASE_URL}/file`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_TOKEN}`,
            },
            body: formData,
        });

        const duration = logger.endTimer('sftp-upload', 'SFTP', 'Upload completed');

        if (!response.ok) {
            throw new Error(`Upload failed: HTTP ${response.status}`);
        }

        logger.info('SFTP', 'Upload successful', { 
            duration,
            filename: creds.remoteFilename 
        });

    } catch (error: unknown) {
        logger.endTimer('sftp-upload', 'SFTP', 'Upload failed');
        throw error;
    }
}

/**
 * Delete a file from SFTP server
 * 
 * @param creds - SFTP credentials
 */
export async function deleteFile(creds: SFTPCredentials): Promise<void> {
    logger.info('SFTP', 'Deleting file', { filename: creds.remoteFilename });

    try {
        const encryptedUsername = encrypt(creds.username);
        const encryptedPassword = encrypt(creds.password);
        const encryptedFilename = encrypt(creds.remoteFilename);

        const params = new URLSearchParams({
            username: encryptedUsername,
            password: encryptedPassword,
            filename: encryptedFilename,
        });

        const response = await fetch(`${API_BASE_URL}/file?${params}`, {
            method: 'DELETE',
            headers: getHeaders(false),
        });

        if (!response.ok) {
            throw new Error(`Delete failed: HTTP ${response.status}`);
        }

        logger.info('SFTP', 'File deleted', { filename: creds.remoteFilename });

    } catch (error: unknown) {
        const err = error as { message?: string };
        logger.error('SFTP', 'Delete failed', { error: err?.message });
        throw error;
    }
}

/**
 * List files in SFTP directory
 * 
 * @param creds - SFTP credentials
 * @returns Array of directory items
 */
export async function listFiles(creds: SFTPCredentials): Promise<SFTPDirectoryItem[]> {
    logger.info('SFTP', 'Listing files');

    try {
        const encryptedUsername = encrypt(creds.username);
        const encryptedPassword = encrypt(creds.password);

        const response = await fetch(`${API_BASE_URL}/fetch`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({
                username: encryptedUsername,
                password: encryptedPassword,
            }),
        });

        if (!response.ok) {
            logger.warn('SFTP', 'Failed to list files', { status: response.status });
            return [];
        }

        const responseText = await response.text();
        let data;
        try {
            data = JSON.parse(responseText);
        } catch {
            return [];
        }

        if (data.tree && Array.isArray(data.tree)) {
            logger.info('SFTP', 'File list retrieved', { count: data.tree.length });
            return data.tree;
        }

        return [];

    } catch (error: unknown) {
        const err = error as { message?: string };
        logger.error('SFTP', 'List files failed', { error: err?.message });
        return [];
    }
}

/**
 * Check if SFTP API is properly configured
 */
export function isSFTPConfigured(): boolean {
    return !!API_TOKEN;
}
