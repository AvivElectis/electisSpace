import { useState } from 'react';
import { Box, Button, Fab, Stack, ClickAwayListener } from '@mui/material';
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
    /** When true, renders mobile FAB layout. When false, renders inline glass row. */
    isMobile?: boolean;
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
}: QuickActionsPanelProps) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);

    const handleAction = (callback: () => void) => {
        setOpen(false);
        callback();
    };

    // Actions for mobile FAB
    const actions = [
        {
            key: 'linkLabel',
            variant: 'contained' as const,
            icon: <LinkIcon sx={{ fontSize: '1.5rem !important' }} />,
            label: t('dashboard.linkLabel', 'Link Label'),
            onClick: onLinkLabel,
        },
        {
            key: 'addSpace',
            variant: 'outlined' as const,
            icon: <AddIcon sx={{ fontSize: '1.5rem !important' }} />,
            label: isPeopleManagerMode
                ? t('dashboard.addPerson', 'Add Person')
                : t('dashboard.addSpace', 'Add Space'),
            onClick: onAddSpace,
        },
        {
            key: 'conference',
            variant: 'outlined' as const,
            icon: <GroupsIcon sx={{ fontSize: '1.5rem !important' }} />,
            label: t('conference.addRoom'),
            onClick: onAddConferenceRoom,
        },
    ];

    if (isMobile) {
        return (
            <ClickAwayListener onClickAway={() => open && setOpen(false)}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    {/* Staggered action buttons */}
                    <Stack direction="column" spacing={1.5} sx={{ mb: 1.5, alignItems: 'stretch' }}>
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
                                        fontWeight: 700,
                                        px: 4,
                                        py: 2.5,
                                        fontSize: '1.3rem',
                                        minHeight: 72,
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
                            width: 72,
                            height: 72,
                            '& .MuiSvgIcon-root': { fontSize: '2rem' },
                        }}
                    >
                        {open ? <CloseIcon /> : <AddIcon />}
                    </Fab>
                </Box>
            </ClickAwayListener>
        );
    }

    // Desktop/Tablet: inline glass row with even gaps
    return (
        <Box sx={glassRowSx}>
            <Button
                variant="contained"
                startIcon={<LinkIcon />}
                onClick={onLinkLabel}
                sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    px: 2.5,
                    py: 1,
                    boxShadow: (theme) => `0 2px 8px ${alpha(theme.palette.primary.main, 0.25)}`,
                }}
            >
                {t('dashboard.linkLabel', 'Link Label')}
            </Button>
            <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={onAddSpace}
                sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 500,
                    px: 2.5,
                    py: 1,
                    borderColor: (theme) => alpha(theme.palette.primary.main, 0.3),
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
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 500,
                    px: 2.5,
                    py: 1,
                    borderColor: (theme) => alpha(theme.palette.primary.main, 0.3),
                    '&:hover': {
                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                        borderColor: 'primary.main',
                    },
                }}
            >
                {t('conference.addRoom')}
            </Button>
        </Box>
    );
}
