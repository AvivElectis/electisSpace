/**
 * Version Comparison Logic
 * 
 * Utilities for comparing semantic versions (semver).
 */

/**
 * Parse a semantic version string into components
 */
function parseVersion(version: string): { major: number; minor: number; patch: number } {
    // Remove 'v' prefix if present
    const cleaned = version.replace(/^v/, '');

    // Split by dots and parse numbers
    const parts = cleaned.split('.').map(p => parseInt(p, 10));

    return {
        major: parts[0] || 0,
        minor: parts[1] || 0,
        patch: parts[2] || 0,
    };
}

/**
 * Compare two semantic versions
 * 
 * @returns positive if v1 > v2, negative if v1 < v2, zero if equal
 */
export function compareVersions(v1: string, v2: string): number {
    const version1 = parseVersion(v1);
    const version2 = parseVersion(v2);

    // Compare major version
    if (version1.major !== version2.major) {
        return version1.major - version2.major;
    }

    // Compare minor version
    if (version1.minor !== version2.minor) {
        return version1.minor - version2.minor;
    }

    // Compare patch version
    return version1.patch - version2.patch;
}

/**
 * Check if the latest version is newer than the current version
 */
export function isNewerVersion(current: string, latest: string): boolean {
    return compareVersions(latest, current) > 0;
}

/**
 * Check if a version should be skipped based on user preference
 */
export function shouldSkipVersion(version: string, skippedVersion: string | null): boolean {
    if (!skippedVersion) return false;
    return version === skippedVersion;
}

/**
 * Format version for display (ensures 'v' prefix)
 */
export function formatVersion(version: string): string {
    return version.startsWith('v') ? version : `v${version}`;
}
