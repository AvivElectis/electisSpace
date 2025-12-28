/**
 * Import/Export File Adapter
 * Handles file system operations for import/export
 */

import { useFileSystem } from '@shared/infrastructure/platform/fileSystemAdapter';
import type { ExportedData } from '../domain/types';

export class ImportExportFileAdapter {
    private fs = useFileSystem();

    /**
     * Save exported data to file
     */
    async saveExport(data: ExportedData): Promise<string | null> {
        const json = JSON.stringify(data, null, 2);
        const filename = `electisSpace-settings-${Date.now()}.json`;

        return await this.fs.saveFile({
            title: 'Export Settings',
            defaultPath: filename,
            data: json,
            filters: [{ name: 'JSON Files', extensions: ['json'] }],
        });
    }

    /**
     * Load import data from file
     */
    async loadImport(): Promise<ExportedData | null> {
        const content = await this.fs.selectFile({
            title: 'Import Settings',
            filters: [{ name: 'JSON Files', extensions: ['json'] }],
        });

        if (!content) {
            return null;
        }

        return JSON.parse(content) as ExportedData;
    }
}
