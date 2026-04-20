import { useState } from 'react';
import { Box, Button, Fab, Stack, ClickAwayListener } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { usePeopleTypeLabels } from '@features/settings/hooks/usePeopleTypeLabels';
import LinkIcon from '@mui/icons-material/Link';
import AddIcon from '@mui/icons-material/Add';
import GroupsIcon from '@mui/icons-material/Groups';
import CloseIcon from '@mui/icons-material/Close';

interface QuickActionsPanelProps {
    isPeopleManagerMode: boolean;
    onLinkLabel: () => void;
    onAddSpace: () => void;
    onAddConferenceRoom: () => void;
    /** When true, renders mobile FAB layout. When false, renders inline glass row. */
    isMobile?: boolean;
    /** Feature flags — only show buttons for enabled features */
    showLabels?: boolean;
    showSpaces?: boolean;
    showConference?: boolean;
}

const glassRowSx = {
    p: 1.5,
    borderRadius: 3,
    display: 'inline-flex',
    gap: 1.5,
    background: (theme: any) =>
        theme.palette.mode === 'dark'
            ? `linear-gradient(145deg, ${alpha(theme.palette.primary.main, 0.15)} 0%, ${alpha(theme.palette.background.paper, 0.25)} 100%)`
            : `linear-gradient(145deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.background.paper, 0.75)} 100%)`,
    backdropFilter: 'blur(40px) saturate(2)',
    WebkitBackdropFilter: 'blur(40px) saturate(2)',
    border: (theme: any) =>
        theme.palette.mode === 'dark'
            ? `1px solid ${alpha(theme.palette.primary.light, 0.2)}`
            : `1.5px solid ${alpha(theme.palette.primary.main, 0.15)}`,
    boxShadow: (theme: any) =>
        theme.palette.mode === 'dark'
            ? `0 8px 24px ${alpha(theme.palette.common.black, 0.35)}, inset 0 1px 0 ${alpha(theme.palette.primary.light, 0.1)}`
            : `0 8px 24px ${alpha(theme.palette.primary.main, 0.1)}, 0 2px 8px ${alpha(theme.palette.common.black, 0.04)}, inset 0 1px 0 ${alpha(theme.palette.common.white, 0.9)}`,
};

export function QuickActionsPanel({
    isPeopleManagerMode,
    onLinkLabel,
    onAddSpace,
    onAddConferenceRoom,
    isMobile,
    showLabels = true,
    showSpaces = true,
    showConference = true,
}: QuickActionsPanelProps) {
    const { t } = useTranslation();
    const { getLabel: getPeopleLabel } = usePeopleTypeLabels();
    const [open, setOpen] = useState(false);

    const handleAction = (callback: () => void) => {
        setOpen(false);
        callback();
    };

    // Build actions list based on enabled features
    const actions = [
        showLabels && {
            key: 'linkLabel',
            variant: 'contained' as const,
            icon: <LinkIcon sx={{ fontSize: '1.5rem !important' }} />,
            label: t('dashboard.linkLabel', 'Link Label'),
            onClick: onLinkLabel,
        },
        showSpaces && {
            key: 'addSpace',
            variant: 'outlined' as const,
            icon: <AddIcon sx={{ fontSize: '1.5rem !important' }} />,
            label: isPeopleManagerMode
                ? getPeopleLabel('add')
                : t('dashboard.addSpace', 'Add Space'),
            onClick: onAddSpace,
        },
        showConference && {
            key: 'conference',
            variant: 'outlined' as const,
            icon: <GroupsIcon sx={{ fontSize: '1.5rem !important' }} />,
            label: t('conference.addRoom'),
            onClick: onAddConferenceRoom,
        },
    ].filter(Boolean) as { key: string; variant: 'contained' | 'outlined'; icon: React.ReactNode; label: string; onClick: () => void }[];

    // Don't render anything if no actions are available
    if (actions.length === 0) return null;

    if (isMobile) {
        return (
            <ClickAwayListener onClickAway={() => open && setOpen(false)}>
                <Box sx={{ display: 'flex', flexDirection: 'column-reverse', alignItems: 'flex-start' }}>
                    {/* FAB trigger — always at the bottom */}
                    <Fab
                        color="primary"
                        size="large"
                        onClick={() => setOpen((prev) => !prev)}
                        sx={{
                            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            transform: open ? 'rotate(45deg)' : 'none',
                            width: 80,
                            height: 80,
                            boxShadow: (theme: any) => `0 8px 28px ${alpha(theme.palette.primary.main, 0.4)}, 0 4px 10px ${alpha(theme.palette.common.black, 0.1)}`,
                            '& .MuiSvgIcon-root': { fontSize: '2.5rem' },
                        }}
                    >
                        {open ? <CloseIcon /> : <AddIcon />}
                    </Fab>

                    {/* Action buttons — fly upward from FAB, full width */}
                    <Stack direction="column" spacing={1.25} sx={{
                        mb: 1.5,
                        width: 'calc(100vw - 32px)',
                    }}>
                        {actions.map((action, index) => {
                            const reverseIndex = actions.length - 1 - index;
                            return (
                                <Box
                                    key={action.key}
                                    sx={{
                                        opacity: open ? 1 : 0,
                                        transform: open ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.9)',
                                        transition: open
                                            ? `opacity 0.2s ease ${reverseIndex * 50}ms, transform 0.25s cubic-bezier(0.4, 0, 0.2, 1) ${reverseIndex * 50}ms`
                                            : `opacity 0.12s ease ${index * 30}ms, transform 0.12s ease ${index * 30}ms`,
                                        pointerEvents: open ? 'auto' : 'none',
                                    }}
                                >
                                    <Button
                                        variant={action.variant}
                                        startIcon={action.icon}
                                        onClick={() => handleAction(action.onClick)}
                                        fullWidth
                                        sx={{
                                            borderRadius: 3,
                                            textTransform: 'none',
                                            fontWeight: 700,
                                            px: 2,
                                            py: 1.75,
                                            fontSize: '1.1rem !important',
                                            minHeight: 64,
                                            '& .MuiButton-startIcon': { '& > *:nth-of-type(1)': { fontSize: '1.5rem' } },
                                            justifyContent: 'center',
                                            boxShadow: (theme: any) => `0 4px 16px ${alpha(theme.palette.common.black, 0.15)}, 0 2px 6px ${alpha(theme.palette.common.black, 0.1)}`,
                                            ...(action.variant === 'contained' && {
                                                background: `linear-gradient(135deg, #0D47A1 0%, #1565C0 50%, #0D47A1 100%)`,
                                                backgroundSize: '200% auto',
                                                boxShadow: (theme: any) => `0 4px 16px ${alpha(theme.palette.primary.main, 0.35)}, 0 2px 6px ${alpha(theme.palette.common.black, 0.15)}`,
                                            }),
                                            ...(action.variant !== 'contained' && {
                                                borderColor: (theme: any) => alpha(theme.palette.primary.main, 0.25),
                                                bgcolor: (theme: any) => theme.palette.mode === 'dark' ? theme.palette.background.paper : '#fff',
                                                '&:active': {
                                                    bgcolor: (theme: any) => alpha(theme.palette.primary.main, 0.08),
                                                },
                                            }),
                                        }}
                                    >
                                        {action.label}
                                    </Button>
                                </Box>
                            );
                        })}
                    </Stack>
                </Box>
            </ClickAwayListener>
        );
    }

    // Desktop/Tablet: inline glass row with even gaps
    return (
        <Box sx={glassRowSx}>
            {actions.map((action) => (
                <Button
                    key={action.key}
                    variant={action.variant}
                    startIcon={action.icon}
                    onClick={action.onClick}
                    sx={{
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: action.variant === 'contained' ? 600 : 500,
                        px: 2.5,
                        py: 1,
                        ...(action.variant === 'contained'
                            ? { boxShadow: (theme: any) => `0 2px 8px ${alpha(theme.palette.primary.main, 0.25)}` }
                            : {
                                  borderColor: (theme: any) => alpha(theme.palette.primary.main, 0.3),
                                  '&:hover': {
                                      bgcolor: (theme: any) => alpha(theme.palette.primary.main, 0.08),
                                      borderColor: 'primary.main',
                                  },
                              }),
                    }}
                >
                    {action.label}
                </Button>
            ))}
        </Box>
    );
}
