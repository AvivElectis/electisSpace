import { useState } from 'react';
import { Box, Button, Fab, Stack, useMediaQuery, useTheme, ClickAwayListener } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import LinkIcon from '@mui/icons-material/Link';
import AddIcon from '@mui/icons-material/Add';
import GroupsIcon from '@mui/icons-material/Groups';
import CloseIcon from '@mui/icons-material/Close';

interface QuickActionsPanelProps {
    isPeopleManagerMode: boolean;
    onLinkLabel: () => void;
    onAddSpace: () => void;
    onAddConferenceRoom: () => void;
}

const glassCardSx = {
    p: 2,
    borderRadius: 3,
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
            ? `0 12px 40px ${alpha(theme.palette.common.black, 0.45)}, inset 0 1px 0 ${alpha(theme.palette.primary.light, 0.1)}, inset 0 -1px 0 ${alpha(theme.palette.common.black, 0.2)}`
            : `0 12px 40px ${alpha(theme.palette.primary.main, 0.12)}, 0 4px 12px ${alpha(theme.palette.common.black, 0.06)}, inset 0 1px 0 ${alpha(theme.palette.common.white, 0.9)}`,
};

export function QuickActionsPanel({
    isPeopleManagerMode,
    onLinkLabel,
    onAddSpace,
    onAddConferenceRoom,
}: QuickActionsPanelProps) {
    const { t } = useTranslation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [open, setOpen] = useState(false);

    const handleAction = (callback: () => void) => {
        setOpen(false);
        callback();
    };

    // Actions ordered bottom-to-top (first = closest to FAB)
    const actions = [
        {
            key: 'conference',
            variant: 'outlined' as const,
            icon: <GroupsIcon />,
            label: t('conference.addRoom'),
            onClick: onAddConferenceRoom,
        },
        {
            key: 'addSpace',
            variant: 'outlined' as const,
            icon: <AddIcon />,
            label: isPeopleManagerMode
                ? t('dashboard.addPerson', 'Add Person')
                : t('dashboard.addSpace', 'Add Space'),
            onClick: onAddSpace,
        },
        {
            key: 'linkLabel',
            variant: 'contained' as const,
            icon: <LinkIcon />,
            label: t('dashboard.linkLabel', 'Link Label'),
            onClick: onLinkLabel,
        },
    ];

    if (isMobile) {
        return (
            <ClickAwayListener onClickAway={() => open && setOpen(false)}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    {/* Staggered action buttons */}
                    <Stack direction="column" spacing={1.5} sx={{ mb: 1.5 }}>
                        {actions.map((action, index) => (
                            <Box
                                key={action.key}
                                sx={{
                                    opacity: open ? 1 : 0,
                                    transform: open ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.85)',
                                    transition: open
                                        ? `opacity 0.2s ease ${index * 60}ms, transform 0.25s cubic-bezier(0.4, 0, 0.2, 1) ${index * 60}ms`
                                        : `opacity 0.15s ease ${(actions.length - 1 - index) * 40}ms, transform 0.15s ease ${(actions.length - 1 - index) * 40}ms`,
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
                                        fontWeight: action.variant === 'contained' ? 600 : 500,
                                        px: 4,
                                        py: action.variant === 'contained' ? 1.5 : 1.3,
                                        fontSize: action.variant === 'contained' ? '1rem' : '0.95rem',
                                        whiteSpace: 'nowrap',
                                        ...(action.variant === 'contained'
                                            ? {
                                                  boxShadow: (theme: any) =>
                                                      `0 4px 14px ${alpha(theme.palette.primary.main, 0.35)}`,
                                              }
                                            : {
                                                  borderColor: (theme: any) => alpha(theme.palette.primary.main, 0.3),
                                                  bgcolor: (theme: any) => alpha(theme.palette.background.paper, 0.85),
                                                  backdropFilter: 'blur(12px)',
                                                  '&:hover': {
                                                      bgcolor: (theme: any) => alpha(theme.palette.primary.main, 0.08),
                                                      borderColor: 'primary.main',
                                                  },
                                              }),
                                    }}
                                >
                                    {action.label}
                                </Button>
                            </Box>
                        ))}
                    </Stack>

                    {/* FAB trigger */}
                    <Fab
                        color="primary"
                        size="large"
                        onClick={() => setOpen((prev) => !prev)}
                        sx={{
                            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            transform: open ? 'rotate(45deg)' : 'none',
                        }}
                    >
                        {open ? <CloseIcon /> : <AddIcon />}
                    </Fab>
                </Box>
            </ClickAwayListener>
        );
    }

    return (
        <Stack direction="column" spacing={2} sx={{ ...glassCardSx, p: 2.5 }}>
            <Button
                variant="contained"
                startIcon={<LinkIcon />}
                onClick={onLinkLabel}
                sx={{
                    borderRadius: 3,
                    textTransform: 'none',
                    fontWeight: 600,
                    px: 4,
                    py: 1.5,
                    fontSize: '1rem',
                    boxShadow: (theme) => `0 4px 14px ${alpha(theme.palette.primary.main, 0.35)}`,
                }}
            >
                {t('dashboard.linkLabel', 'Link Label')}
            </Button>
            <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={onAddSpace}
                sx={{
                    borderRadius: 3,
                    textTransform: 'none',
                    fontWeight: 500,
                    px: 4,
                    py: 1.3,
                    fontSize: '0.95rem',
                    borderColor: (theme) => alpha(theme.palette.primary.main, 0.3),
                    bgcolor: (theme) => alpha(theme.palette.background.paper, 0.5),
                    '&:hover': {
                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                        borderColor: 'primary.main',
                    },
                }}
            >
                {isPeopleManagerMode
                    ? t('dashboard.addPerson', 'Add Person')
                    : t('dashboard.addSpace', 'Add Space')}
            </Button>
            <Button
                variant="outlined"
                startIcon={<GroupsIcon />}
                onClick={onAddConferenceRoom}
                sx={{
                    borderRadius: 3,
                    textTransform: 'none',
                    fontWeight: 500,
                    px: 4,
                    py: 1.3,
                    fontSize: '0.95rem',
                    borderColor: (theme) => alpha(theme.palette.primary.main, 0.3),
                    bgcolor: (theme) => alpha(theme.palette.background.paper, 0.5),
                    '&:hover': {
                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                        borderColor: 'primary.main',
                    },
                }}
            >
                {t('conference.addRoom')}
            </Button>
        </Stack>
    );
}
