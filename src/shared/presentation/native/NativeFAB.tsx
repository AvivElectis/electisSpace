import { useState } from 'react';
import type { ReactNode } from 'react';
import { Box, Fab, Typography, ClickAwayListener, Zoom } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { nativeSizing } from '../themes/nativeTokens';

export interface NativeFABAction {
    icon: ReactNode;
    label: string;
    onClick: () => void;
}

export interface NativeFABProps {
    actions: NativeFABAction[];
    mainIcon?: ReactNode;
}

async function triggerHaptic() {
    try {
        await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
        // Haptics not available on web — fall back to vibrate
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            navigator.vibrate(10);
        }
    }
}

export function NativeFAB({ actions, mainIcon }: NativeFABProps) {
    const [open, setOpen] = useState(false);

    const bottomOffset = `calc(${nativeSizing.bottomNavHeight}px + 16px + env(safe-area-inset-bottom, 0px))`;

    const handleMainTap = () => {
        triggerHaptic().catch(() => {});
        if (actions.length === 1) {
            actions[0].onClick();
        } else {
            setOpen((prev) => !prev);
        }
    };

    const handleActionTap = (action: NativeFABAction) => {
        triggerHaptic().catch(() => {});
        action.onClick();
        setOpen(false);
    };

    if (actions.length === 1) {
        return (
            <Fab
                color="primary"
                onClick={handleMainTap}
                aria-label={actions[0].label}
                sx={{
                    position: 'fixed',
                    bottom: bottomOffset,
                    insetInlineEnd: 16,
                }}
            >
                {mainIcon ?? <AddIcon />}
            </Fab>
        );
    }

    return (
        <ClickAwayListener onClickAway={() => setOpen(false)}>
            <Box
                sx={{
                    position: 'fixed',
                    bottom: bottomOffset,
                    insetInlineEnd: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: 1.5,
                }}
            >
                {/* Sub-actions */}
                {actions.map((action, idx) => (
                    <Zoom key={idx} in={open} style={{ transitionDelay: open ? `${idx * 40}ms` : '0ms' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box
                                sx={{
                                    bgcolor: 'background.paper',
                                    px: 1.5,
                                    py: 0.5,
                                    borderRadius: 2,
                                    boxShadow: 2,
                                }}
                            >
                                <Typography variant="body2" fontWeight={600} noWrap>
                                    {action.label}
                                </Typography>
                            </Box>
                            <Fab
                                size="small"
                                color="primary"
                                onClick={() => handleActionTap(action)}
                                aria-label={action.label}
                            >
                                {action.icon}
                            </Fab>
                        </Box>
                    </Zoom>
                ))}

                {/* Main FAB */}
                <Fab
                    color="primary"
                    onClick={handleMainTap}
                    aria-label="actions"
                    sx={{
                        transition: 'transform 0.2s ease',
                        transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
                    }}
                >
                    {open ? <CloseIcon /> : (mainIcon ?? <AddIcon />)}
                </Fab>
            </Box>
        </ClickAwayListener>
    );
}
