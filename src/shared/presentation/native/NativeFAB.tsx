import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { Box, Fab, Typography, ClickAwayListener, Zoom, Tooltip } from '@mui/material';
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
        // Haptics not available
    }
}

const bottomOffset = `calc(${nativeSizing.bottomNavHeight}px + 16px + env(safe-area-inset-bottom, 0px))`;

/**
 * Floating Action Button — renders via portal to avoid overflow:auto clipping.
 * Single action: round FAB with long-press tooltip.
 * Multiple actions: speed dial with labeled sub-actions.
 */
export function NativeFAB({ actions, mainIcon }: NativeFABProps) {
    const [open, setOpen] = useState(false);

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

    const fab = actions.length === 1 ? (
        <Tooltip
            title={actions[0].label}
            placement="left"
            arrow
            enterTouchDelay={300}
            leaveTouchDelay={1500}
        >
            <Fab
                color="primary"
                onClick={handleMainTap}
                aria-label={actions[0].label}
                sx={{
                    position: 'fixed',
                    bottom: bottomOffset,
                    insetInlineEnd: 16,
                    width: 60,
                    height: 60,
                    zIndex: 1050,
                }}
            >
                {mainIcon ?? <AddIcon sx={{ fontSize: 28 }} />}
            </Fab>
        </Tooltip>
    ) : (
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
                    zIndex: 1050,
                }}
            >
                {/* Sub-actions — label shown next to each FAB */}
                {actions.map((action, idx) => (
                    <Zoom key={idx} in={open} style={{ transitionDelay: open ? `${idx * 50}ms` : '0ms' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box
                                sx={{
                                    bgcolor: 'background.paper',
                                    px: 2,
                                    py: 0.75,
                                    borderRadius: 2,
                                    boxShadow: 3,
                                }}
                            >
                                <Typography variant="body2" fontWeight={600} noWrap>
                                    {action.label}
                                </Typography>
                            </Box>
                            <Tooltip
                                title={action.label}
                                placement="left"
                                arrow
                                enterTouchDelay={300}
                                leaveTouchDelay={1500}
                            >
                                <Fab
                                    color="primary"
                                    onClick={() => handleActionTap(action)}
                                    aria-label={action.label}
                                    sx={{ width: 48, height: 48 }}
                                >
                                    {action.icon}
                                </Fab>
                            </Tooltip>
                        </Box>
                    </Zoom>
                ))}

                {/* Main FAB */}
                <Tooltip
                    title={open ? '' : actions.map(a => a.label).join(', ')}
                    placement="left"
                    arrow
                    enterTouchDelay={300}
                    leaveTouchDelay={1500}
                >
                    <Fab
                        color="primary"
                        onClick={handleMainTap}
                        aria-label="actions"
                        sx={{
                            width: 60,
                            height: 60,
                            transition: 'transform 0.2s ease',
                            transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
                        }}
                    >
                        {open ? <CloseIcon sx={{ fontSize: 28 }} /> : (mainIcon ?? <AddIcon sx={{ fontSize: 28 }} />)}
                    </Fab>
                </Tooltip>
            </Box>
        </ClickAwayListener>
    );

    return createPortal(fab, document.body);
}
