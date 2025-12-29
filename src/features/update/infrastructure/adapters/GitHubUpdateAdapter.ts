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
            console.log('[GitHub Update] Fetching latest release from:', url);

            const response = await fetch(url);

            if (!response.ok) {
                if (response.status === 404) {
                    console.warn('[GitHub Update] 404 - No releases found or repo not accessible. Check:', {
                        url,
                        owner: this.owner,
                        repo: this.repo,
                        note: 'Verify repository is public and has a published (non-draft, non-prerelease) release'
                    });
                    return null;
                }
                console.error('[GitHub Update] API error:', response.status, response.statusText);
                throw new Error(`GitHub API error: ${response.status}`);
            }

            const release: GitHubRelease = await response.json();
            console.log('[GitHub Update] Latest release found:', release.tag_name);
            return release;
        } catch (error) {
            console.error('[GitHub Update] Error fetching latest release:', error);
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
