import { Box, IconButton, Typography } from '@mui/material';
import MinimizeIcon from '@mui/icons-material/Minimize';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import CloseIcon from '@mui/icons-material/Close';
import FilterNoneIcon from '@mui/icons-material/FilterNone';
import { useState, useEffect } from 'react';
import { detectPlatform } from '@shared/infrastructure/platform/platformDetector';

interface CustomTitleBarProps {
    title?: string;
}

/**
 * Custom Title Bar for Frameless Electron Window
 * Provides drag area and window controls (minimize, maximize, close)
 */
export function CustomTitleBar({ title = 'electis Space' }: CustomTitleBarProps) {
    const [isMaximized, setIsMaximized] = useState(false);
    const platform = detectPlatform();

    // Only show custom title bar in Electron
    if (platform !== 'electron') {
        return null;
    }

    useEffect(() => {
        // Check initial maximized state
        const checkMaximized = async () => {
            if ((window as any).electronAPI?.windowIsMaximized) {
                const maximized = await (window as any).electronAPI.windowIsMaximized();
                setIsMaximized(maximized);
            }
        };
        checkMaximized();
    }, []);

    const handleMinimize = () => {
        if ((window as any).electronAPI?.windowMinimize) {
            (window as any).electronAPI.windowMinimize();
        }
    };

    const handleMaximize = async () => {
        if ((window as any).electronAPI?.windowMaximize) {
            await (window as any).electronAPI.windowMaximize();
            // Update state after toggling
            const maximized = await (window as any).electronAPI.windowIsMaximized();
            setIsMaximized(maximized);
        }
    };

    const handleClose = () => {
        if ((window as any).electronAPI?.windowClose) {
            (window as any).electronAPI.windowClose();
        }
    };

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                height: 32,
                backgroundColor: 'background.paper',
                borderBottom: '1px solid',
                borderColor: 'divider',
                WebkitAppRegion: 'drag', // Makes the title bar draggable
                userSelect: 'none',
                position: 'relative',
                zIndex: 1300, // Above most content
            }}
        >
            {/* App Title */}
            <Box sx={{ display: 'flex', alignItems: 'center', pl: 2 }}>
                <Typography variant="caption" sx={{ fontWeight: 500, color: 'text.secondary' }}>
                    {title}
                </Typography>
            </Box>

            {/* Window Controls */}
            <Box
                sx={{
                    display: 'flex',
                    WebkitAppRegion: 'no-drag', // Make buttons clickable
                }}
            >
                <IconButton
                    onClick={handleMinimize}
                    size="small"
                    sx={{
                        borderRadius: 0,
                        width: 46,
                        height: 32,
                        '&:hover': {
                            backgroundColor: 'action.hover',
                        },
                    }}
                >
                    <MinimizeIcon sx={{ fontSize: 16 }} />
                </IconButton>
                <IconButton
                    onClick={handleMaximize}
                    size="small"
                    sx={{
                        borderRadius: 0,
                        width: 46,
                        height: 32,
                        '&:hover': {
                            backgroundColor: 'action.hover',
                        },
                    }}
                >
                    {isMaximized ? (
                        <FilterNoneIcon sx={{ fontSize: 14 }} />
                    ) : (
                        <CropSquareIcon sx={{ fontSize: 16 }} />
                    )}
                </IconButton>
                <IconButton
                    onClick={handleClose}
                    size="small"
                    sx={{
                        borderRadius: 0,
                        width: 46,
                        height: 32,
                        '&:hover': {
                            backgroundColor: 'error.main',
                            color: 'error.contrastText',
                        },
                    }}
                >
                    <CloseIcon sx={{ fontSize: 16 }} />
                </IconButton>
            </Box>
        </Box>
    );
}
