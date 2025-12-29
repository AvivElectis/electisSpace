import { Box, Typography, Button, Stack } from '@mui/material';
import { type ReactNode } from 'react';

interface EmptyStateProps {
    /** Icon to display (MUI icon component) */
    icon?: ReactNode;
    /** Title text */
    title: string;
    /** Description text */
    description?: string;
    /** Action button label */
    actionLabel?: string;
    /** Action button click handler */
    onAction?: () => void;
    /** Secondary action button label */
    secondaryActionLabel?: string;
    /** Secondary action button click handler */
    onSecondaryAction?: () => void;
}

/**
 * Empty state component
 * Displays when there's no data to show with optional call-to-action
 * 
 * @example
 * <EmptyState
 *   icon={<FolderOpenIcon sx={{ fontSize: 80 }} />}
 *   title={t('spaces.noSpaces')}
 *   description={t('spaces.noSpacesDescription')}
 *   actionLabel={t('spaces.addSpace')}
 *   onAction={handleAddSpace}
 * />
 */
export function EmptyState({
    icon,
    title,
    description,
    actionLabel,
    onAction,
    secondaryActionLabel,
    onSecondaryAction,
}: EmptyStateProps) {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 400,
                textAlign: 'center',
                py: 6,
                px: 3,
            }}
        >
            <Stack spacing={3} alignItems="center" maxWidth={500}>
                {icon && (
                    <Box sx={{ color: 'text.secondary', opacity: 0.5 }}>
                        {icon}
                    </Box>
                )}

                <Typography variant="h5" color="text.secondary" fontWeight={500}>
                    {title}
                </Typography>

                {description && (
                    <Typography variant="body2" color="text.secondary">
                        {description}
                    </Typography>
                )}

                {(actionLabel || secondaryActionLabel) && (
                    <Stack direction="row" spacing={2}>
                        {actionLabel && onAction && (
                            <Button
                                variant="contained"
                                onClick={onAction}
                                size="large"
                            >
                                {actionLabel}
                            </Button>
                        )}
                        {secondaryActionLabel && onSecondaryAction && (
                            <Button
                                variant="outlined"
                                onClick={onSecondaryAction}
                                size="large"
                            >
                                {secondaryActionLabel}
                            </Button>
                        )}
                    </Stack>
                )}
            </Stack>
        </Box>
    );
}
