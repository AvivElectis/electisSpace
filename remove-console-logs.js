/**
 * Remove console.log statements from source files
 * Keeps console.error and console.warn for debugging
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all TS/TSX files in src directory
const files = glob.sync('src/**/*.{ts,tsx}', {
    ignore: ['**/node_modules/**', '**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}']
});

let totalRemoved = 0;
let filesModified = 0;

files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    let modified = content;
    let removedInFile = 0;

    // Remove console.log statements (but keep console.error, console.warn, console.info, console.debug)
    // Match console.log(...) including multi-line
    const consoleLogRegex = /console\.log\s*\([^)]*(?:\([^)]*\))*[^)]*\)\s*;?/g;

    // Simple single-line console.log removal
    modified = modified.replace(/^\s*console\.log\(.*?\);?\s*$/gm, (match) => {
        removedInFile++;
        return '';
    });

    // Remove console.log with multi-line content
    modified = modified.replace(/console\.log\(\s*[\s\S]*?\);/g, (match) => {
        // Don't remove if it's actually console.error or console.warn
        if (match.includes('console.error') || match.includes('console.warn')) {
            return match;
        }
        removedInFile++;
        return '';
    });

    // Remove empty lines that were left behind
    modified = modified.replace(/^\s*\n/gm, '\n');

    if (modified !== content) {
        fs.writeFileSync(file, modified, 'utf8');
        filesModified++;
        totalRemoved += removedInFile;
        console.log(`✓ ${file} - removed ${removedInFile} console.log(s)`);
    }
});

console.log(`\n✅ Done! Removed ${totalRemoved} console.log statements from ${filesModified} files.`);
