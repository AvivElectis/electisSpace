/**
 * NativeFormSection
 *
 * Card-based form section for native pages.
 * Renders a labeled section header + white card container with dividers between children.
 */

import { Box, Typography } from '@mui/material';

interface NativeFormSectionProps {
    title: string;
    children: React.ReactNode;
}

export function NativeFormSection({ title, children }: NativeFormSectionProps) {
    return (
        <Box sx={{ mb: 1.5 }}>
            <Typography
                variant="overline"
                sx={{
                    color: 'primary.main',
                    fontWeight: 600,
                    letterSpacing: 0.5,
                    fontSize: '0.68rem',
                    px: 0.5,
                    mb: 1,
                    display: 'block',
                }}
            >
                {title}
            </Typography>
            <Box
                sx={{
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    '& > :not(:last-child)': {
                        borderBottom: '1px solid #f0f0f0',
                    },
                }}
            >
                {children}
            </Box>
        </Box>
    );
}
