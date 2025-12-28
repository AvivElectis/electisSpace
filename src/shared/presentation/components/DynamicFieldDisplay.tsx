/**
 * Dynamic Field Display Component
 * 
 * Renders entity fields based on working mode and configuration:
 * - SoluM mode: Uses visible fields from mapping config with friendly names
 * - SFTP mode: Uses CSV column configuration with headers
 */

import { useMemo } from 'react';
import { Box, Typography, Stack } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { SolumMappingConfig } from '@features/settings/domain/types';
import type { CSVColumn } from '@features/configuration/domain/types';

interface DynamicFieldDisplayProps {
    /** Raw field data from entity */
    data: Record<string, string>;
    /** Current working mode */
    mode: 'solum' | 'sftp';
    /** SoluM mapping configuration (required in SoluM mode) */
    solumMappingConfig?: SolumMappingConfig;
    /** SFTP CSV columns (required in SFTP mode) */
    sftpCsvColumns?: CSVColumn[];
    /** Display variant */
    variant?: 'table' | 'form';
}

interface FieldItem {
    key: string;
    label: string;
    value: string;
}

/**
 * Renders entity fields dynamically based on working mode
 */
export function DynamicFieldDisplay({
    data,
    mode,
    solumMappingConfig,
    sftpCsvColumns,
    variant = 'form'
}: DynamicFieldDisplayProps) {
    const { i18n } = useTranslation();
    const currentLanguage = i18n.language as 'en' | 'he';

    // Extract fields based on mode
    const fields = useMemo((): FieldItem[] => {
        if (mode === 'solum' && solumMappingConfig) {
            // SoluM mode: Show only visible fields with friendly names
            // Convert object to array of entries
            return Object.entries(solumMappingConfig.fields)
                .filter(([_, fieldConfig]) => fieldConfig.visible)
                .map(([fieldKey, fieldConfig]) => ({
                    key: fieldKey,
                    label: currentLanguage === 'he' ? fieldConfig.friendlyNameHe : fieldConfig.friendlyNameEn,
                    value: data[fieldKey] || ''
                }))
                .filter((item) => item.value); // Only show fields with values
        } else if (mode === 'sftp' && sftpCsvColumns) {
            // SFTP mode: Show configured CSV columns with headers
            return sftpCsvColumns
                .map((column) => ({
                    key: column.aimsValue,
                    label: currentLanguage === 'he' ? column.headerHe : column.headerEn,
                    value: data[column.aimsValue] || ''
                }))
                .filter((item) => item.value); // Only show fields with values
        }

        return [];
    }, [data, mode, solumMappingConfig, sftpCsvColumns, currentLanguage]);

    if (fields.length === 0) {
        return null;
    }

    if (variant === 'table') {
        // Render in compact inline format for tables
        return (
            <Box>
                {fields.map((field, index) => (
                    <Typography key={field.key} variant="body2" component="span">
                        <strong>{field.label}:</strong> {field.value}
                        {index < fields.length - 1 && ' • '}
                    </Typography>
                ))}
            </Box>
        );
    }

    // Default: form variant (stacked layout)
    return (
        <Stack spacing={1.5}>
            {fields.map(field => (
                <Box key={field.key}>
                    <Typography variant="caption" color="text.secondary">
                        {field.label}
                    </Typography>
                    <Typography variant="body2">
                        {field.value}
                    </Typography>
                </Box>
            ))}
        </Stack>
    );
}
