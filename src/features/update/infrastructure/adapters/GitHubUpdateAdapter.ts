/**
 * GitHub Update Adapter
 * 
 * Fetches release information from GitHub Releases API.
 */

import type { UpdateInfo } from '../../domain/types';
import { isNewerVersion } from '../../domain/versionComparison';

export interface GitHubRelease {
    tag_name: string;
    name: string;
    body: string;
    published_at: string;
    assets: Array<{
        name: string;
        browser_download_url: string;
        size: number;
    }>;
}

export class GitHubUpdateAdapter {
    private owner: string;
    private repo: string;

    constructor(owner: string, repo: string) {
        this.owner = owner;
        this.repo = repo;
    }

    /**
     * Fetch the latest release from GitHub
     */
    async getLatestRelease(): Promise<GitHubRelease | null> {
        try {
            const url = `https://api.github.com/repos/${this.owner}/${this.repo}/releases/latest`;
            const response = await fetch(url);

            if (!response.ok) {
                if (response.status === 404) {
                    // console.log('No releases found');
                    return null;
                }
                throw new Error(`GitHub API error: ${response.status}`);
            }

            const release: GitHubRelease = await response.json();
            return release;
        } catch (error) {
            // console.error('Error fetching latest release:', error);
            return null;
        }
    }

    /**
     * Check if an update is available
     */
    async checkForUpdate(currentVersion: string, platform: 'windows' | 'android'): Promise<UpdateInfo | null> {
        const release = await this.getLatestRelease();
        if (!release) return null;

        const latestVersion = release.tag_name.replace(/^v/, '');
        const current = currentVersion.replace(/^v/, '');

        // Check if newer version available
        if (!isNewerVersion(current, latestVersion)) {
            return null;
        }

        // Find the appropriate asset for the platform
        const assetExtension = platform === 'windows' ? '.exe' : '.apk';
        const asset = release.assets.find(a => a.name.endsWith(assetExtension));

        return {
            version: latestVersion,
            releaseDate: release.published_at,
            releaseNotes: release.body,
            downloadUrl: asset?.browser_download_url,
            platform,
            fileSize: asset?.size,
        };
    }
}

/**
 * Default GitHub adapter instance
 */
export const githubUpdateAdapter = new GitHubUpdateAdapter(
    'AvivElectis',
    'electisSpace'
);
