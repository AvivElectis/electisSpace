import { Box, Typography, Paper } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { ManualSection as ManualSectionType } from '../domain/types';

interface ManualSectionProps {
    section: ManualSectionType;
    isLast?: boolean;
}

/**
 * Manual Section Component
 * 
 * Renders a single section of manual content with:
 * - Translated title and content
 * - Support for multi-line content
 * - Consistent styling
 */
export function ManualSection({ section, isLast = false }: ManualSectionProps) {
    const { t } = useTranslation();

    // Get content - may contain newlines for paragraphs
    const content = t(section.contentKey);
    
    // Split content into paragraphs
    const paragraphs = content.split('\n').filter(p => p.trim());

    return (
        <Paper
            variant="outlined"
            sx={{
                p: { xs: 2, sm: 3 },
                mb: isLast ? 0 : 2,
                bgcolor: 'background.default',
            }}
        >
            <Typography
                variant="h6"
                fontWeight="medium"
                gutterBottom
                sx={{ color: 'primary.main' }}
            >
                {t(section.titleKey)}
            </Typography>
            
            <Box sx={{ mt: 1 }}>
                {paragraphs.map((paragraph, index) => (
                    <Typography
                        key={index}
                        variant="body1"
                        sx={{
                            mb: index < paragraphs.length - 1 ? 2 : 0,
                            lineHeight: 1.7,
                            color: 'text.secondary',
                        }}
                    >
                        {paragraph}
                    </Typography>
                ))}
            </Box>
        </Paper>
    );
}
