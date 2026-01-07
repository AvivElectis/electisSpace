/**
 * SFTP API Client
 * HTTP client for communicating with the SFTP proxy API at solum.co.il/sftp
 * 
 * All credentials are encrypted using AES-256-CBC before transmission
 */

import axios, { type AxiosInstance, type AxiosError } from 'axios';
import { encrypt } from './encryption';
import { logger } from './logger';

/**
 * SFTP API Base URL
 * In development, uses Vite proxy to avoid CORS
 * In production, uses the direct URL
 */
const API_BASE_URL = import.meta.env.DEV
    ? '/sftp-api'
    : 'https://solum.co.il/sftp';

/**
 * SFTP API Bearer Token
 */
const API_TOKEN = import.meta.env.VITE_SFTP_API_TOKEN || '';

/**
 * SFTP Credentials interface
 */
export interface SFTPCredentials {
    username: string;
    password: string;
    remoteFilename: string;  // default: "esl.csv"
    host?: string;           // SFTP host (optional, may be implicit)
    port?: number;           // SFTP port (default: 22)
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
interface SFTPFetchResponse {
    success: boolean;
    tree?: SFTPDirectoryItem[];
    error?: string;
}

export interface SFTPFileResponse {
    success: boolean;
    content?: string;
    error?: string;
}

/**
 * Create axios instance with auth headers
 */
function createApiClient(): AxiosInstance {
    if (!API_TOKEN) {
        logger.warn('SFTP', 'SFTP API token not configured');
    }

    return axios.create({
        baseURL: API_BASE_URL,
        headers: {
            'Authorization': `Bearer ${API_TOKEN}`,
        },
        timeout: 30000, // 30 second timeout
    });
}

/**
 * Handle API errors with logging
 */
function handleApiError(error: AxiosError, operation: string): never {
    const status = error.response?.status;
    const message = error.response?.data 
        ? (typeof error.response.data === 'object' && 'error' in error.response.data 
            ? (error.response.data as { error: string }).error 
            : JSON.stringify(error.response.data))
        : error.message;

    logger.error('SFTP', `${operation} failed`, { status, message });
    
    if (status === 401) {
        throw new Error('SFTP API authentication failed. Check API token.');
    } else if (status === 403) {
        throw new Error('SFTP access denied. Check credentials.');
    } else if (status === 404) {
        throw new Error('File not found on SFTP server.');
    } else if (status === 500) {
        throw new Error('SFTP server error. Please try again later.');
    } else {
        throw new Error(`SFTP ${operation} failed: ${message}`);
    }
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
    logger.info('SFTP', 'Testing connection', { username: creds.username, host: creds.host, port: creds.port });

    const client = createApiClient();

    try {
        const response = await client.post<SFTPFetchResponse>('/fetch', {
            username: encrypt(creds.username),
            password: encrypt(creds.password),
            host: creds.host ? encrypt(creds.host) : undefined,
            port: creds.port || 22,
        });

        const duration = logger.endTimer('sftp-test-connection', 'SFTP', 'Connection test completed');
        
        if (response.data.success) {
            logger.info('SFTP', 'Connection test successful', { 
                duration,
                fileCount: response.data.tree?.length || 0 
            });
            return true;
        } else {
            logger.warn('SFTP', 'Connection test failed', { error: response.data.error });
            return false;
        }
    } catch (error) {
        logger.endTimer('sftp-test-connection', 'SFTP', 'Connection test failed');
        if (axios.isAxiosError(error)) {
            handleApiError(error, 'Connection test');
        }
        throw error;
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
    logger.info('SFTP', 'Downloading file', { filename: creds.remoteFilename, host: creds.host, port: creds.port });

    const client = createApiClient();

    try {
        const response = await client.get<string>('/file', {
            params: {
                username: encrypt(creds.username),
                password: encrypt(creds.password),
                filename: encrypt(creds.remoteFilename),
                host: creds.host ? encrypt(creds.host) : undefined,
                port: creds.port || 22,
            },
            responseType: 'text',
        });

        const content = response.data;
        const duration = logger.endTimer('sftp-download', 'SFTP', 'File downloaded');
        
        logger.info('SFTP', 'Download successful', { 
            duration,
            size: content.length,
            filename: creds.remoteFilename 
        });
        
        return content;
    } catch (error) {
        logger.endTimer('sftp-download', 'SFTP', 'Download failed');
        if (axios.isAxiosError(error)) {
            handleApiError(error, 'Download');
        }
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
        host: creds.host,
        port: creds.port 
    });

    const client = createApiClient();

    try {
        const formData = new FormData();
        const blob = new Blob([content], { type: 'text/csv' });
        formData.append('file', blob, creds.remoteFilename);
        formData.append('username', encrypt(creds.username));
        formData.append('password', encrypt(creds.password));
        formData.append('filename', encrypt(creds.remoteFilename));
        if (creds.host) formData.append('host', encrypt(creds.host));
        formData.append('port', String(creds.port || 22));

        await client.post('/file', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });

        const duration = logger.endTimer('sftp-upload', 'SFTP', 'File uploaded');
        logger.info('SFTP', 'Upload successful', { 
            duration,
            filename: creds.remoteFilename 
        });
    } catch (error) {
        logger.endTimer('sftp-upload', 'SFTP', 'Upload failed');
        if (axios.isAxiosError(error)) {
            handleApiError(error, 'Upload');
        }
        throw error;
    }
}

/**
 * Delete a file from SFTP server
 * 
 * @param creds - SFTP credentials
 */
export async function deleteFile(creds: SFTPCredentials): Promise<void> {
    logger.info('SFTP', 'Deleting file', { filename: creds.remoteFilename, host: creds.host, port: creds.port });

    const client = createApiClient();

    try {
        await client.delete('/file', {
            params: {
                username: encrypt(creds.username),
                password: encrypt(creds.password),
                filename: encrypt(creds.remoteFilename),
                host: creds.host ? encrypt(creds.host) : undefined,
                port: creds.port || 22,
            },
        });

        logger.info('SFTP', 'File deleted', { filename: creds.remoteFilename });
    } catch (error) {
        if (axios.isAxiosError(error)) {
            handleApiError(error, 'Delete');
        }
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
    logger.info('SFTP', 'Listing files', { host: creds.host, port: creds.port });

    const client = createApiClient();

    try {
        const response = await client.post<SFTPFetchResponse>('/fetch', {
            username: encrypt(creds.username),
            password: encrypt(creds.password),
            host: creds.host ? encrypt(creds.host) : undefined,
            port: creds.port || 22,
        });

        if (response.data.success && response.data.tree) {
            logger.info('SFTP', 'File list retrieved', { 
                count: response.data.tree.length 
            });
            return response.data.tree;
        } else {
            logger.warn('SFTP', 'Failed to list files', { error: response.data.error });
            return [];
        }
    } catch (error) {
        if (axios.isAxiosError(error)) {
            handleApiError(error, 'List files');
        }
        throw error;
    }
}

/**
 * Check if SFTP API is properly configured
 */
export function isSFTPConfigured(): boolean {
    return !!API_TOKEN;
}
