/**
 * Dynamic Field Display Component
 * 
 * Renders entity fields based on SoluM mapping configuration with friendly names.
 */

import { useMemo } from 'react';
import { Box, Typography, Stack } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { SolumMappingConfig } from '@features/settings/domain/types';

interface DynamicFieldDisplayProps {
    /** Raw field data from entity */
    data: Record<string, string>;
    /** SoluM mapping configuration */
    solumMappingConfig?: SolumMappingConfig;
    /** Display variant */
    variant?: 'table' | 'form';
}

interface FieldItem {
    key: string;
    label: string;
    value: string;
}

/**
 * Renders entity fields dynamically based on SoluM mapping config
 */
export function DynamicFieldDisplay({
    data,
    solumMappingConfig,
    variant = 'form'
}: DynamicFieldDisplayProps) {
    const { i18n } = useTranslation();
    const currentLanguage = i18n.language as 'en' | 'he';

    // Extract fields from SoluM mapping config
    const fields = useMemo((): FieldItem[] => {
        if (solumMappingConfig) {
            // Show only visible fields with friendly names
            return Object.entries(solumMappingConfig.fields)
                .filter(([_, fieldConfig]) => fieldConfig.visible)
                .map(([fieldKey, fieldConfig]) => {
                    // Use friendly names if they exist and are not just the field key itself
                    // (default config sets friendly names to field key, which is not user-friendly)
                    const labelHe = (fieldConfig.friendlyNameHe && fieldConfig.friendlyNameHe !== fieldKey)
                        ? fieldConfig.friendlyNameHe
                        : fieldKey;
                    const labelEn = (fieldConfig.friendlyNameEn && fieldConfig.friendlyNameEn !== fieldKey)
                        ? fieldConfig.friendlyNameEn
                        : fieldKey;

                    return {
                        key: fieldKey,
                        label: currentLanguage === 'he' ? labelHe : labelEn,
                        value: data[fieldKey] || ''
                    };
                })
                .filter((item) => item.value); // Only show fields with values
        }

        return [];
    }, [data, solumMappingConfig, currentLanguage]);

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
        <Stack gap={1.5}>
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
