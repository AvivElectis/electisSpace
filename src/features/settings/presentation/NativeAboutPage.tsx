/**
 * NativeAboutPage
 *
 * Full-page About screen for native (Android/iOS) builds.
 * - Blue header bar with back arrow + title + safe-area padding
 * - Centered app icon, app name, version, platform info
 * - Release notes for current version
 * - Collapsible version history
 */

import {
    Box,
    Typography,
    IconButton,
    Paper,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Chip,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HistoryIcon from '@mui/icons-material/History';
import NewReleasesIcon from '@mui/icons-material/NewReleases';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useNativePlatform } from '@shared/presentation/hooks/useNativePlatform';

declare const __APP_VERSION__: string;

export function NativeAboutPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { platform } = useNativePlatform();

    const handleBack = useCallback(() => {
        navigate(-1);
    }, [navigate]);

    const platformLabel = platform === 'android' ? 'Android'
        : platform === 'ios' ? 'iOS'
        : platform === 'electron' ? 'Desktop'
        : 'Web';

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
            {/* Blue header with back arrow + title + safe-area padding */}
            <Box
                sx={{
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    paddingTop: 'max(env(safe-area-inset-top, 0px), 28px)',
                    display: 'flex',
                    alignItems: 'center',
                    px: 1,
                    py: 0.5,
                    minHeight: 48,
                }}
            >
                <IconButton
                    onClick={handleBack}
                    sx={{ color: 'primary.contrastText' }}
                    size="small"
                    aria-label="back"
                >
                    <ArrowBackIcon />
                </IconButton>
                <Typography variant="subtitle1" fontWeight={600} sx={{ flex: 1, mx: 1 }}>
                    {t('nativeSettings.about')}
                </Typography>
            </Box>

            {/* Scrollable content */}
            <Box sx={{ flex: 1, overflow: 'auto', px: 2, py: 3 }}>
                {/* App icon + name + version */}
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
                    <Box
                        component="img"
                        src={`${import.meta.env.BASE_URL}logos/AppIcon.png`}
                        alt="electisSpace"
                        sx={{
                            width: 100,
                            height: 100,
                            borderRadius: 3,
                            mb: 2,
                            boxShadow: 3,
                            objectFit: 'contain',
                        }}
                    />
                    <Typography variant="h5" fontWeight={700} gutterBottom>
                        electisSpace
                    </Typography>
                    <Typography variant="body1" color="text.secondary" gutterBottom>
                        v{__APP_VERSION__}
                    </Typography>
                    <Chip
                        label={platformLabel}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ mt: 0.5 }}
                    />
                </Box>

                {/* Release Notes */}
                <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, mb: 2, bgcolor: 'background.default' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <NewReleasesIcon sx={{ color: 'primary.main' }} />
                        <Typography variant="h6" fontWeight="medium" sx={{ color: 'primary.main' }}>
                            {t('manual.contactInfo.releaseNotesTitle')}
                        </Typography>
                    </Box>
                    {/* Current version notes */}
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle1" fontWeight="bold">
                            v{__APP_VERSION__}
                        </Typography>
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ lineHeight: 1.7, mt: 0.5, whiteSpace: 'pre-line' }}
                        >
                            {t('manual.contactInfo.releaseNotesContent')}
                        </Typography>
                    </Box>

                    {/* Version History (collapsed by default) */}
                    <Accordion
                        disableGutters
                        elevation={0}
                        sx={{
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: '8px !important',
                            '&::before': { display: 'none' },
                            bgcolor: 'background.paper',
                        }}
                    >
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <HistoryIcon fontSize="small" color="action" />
                                <Typography variant="body2" fontWeight={600}>
                                    {t('manual.contactInfo.versionHistory')}
                                </Typography>
                            </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ lineHeight: 1.7, whiteSpace: 'pre-line' }}
                            >
                                {t('manual.contactInfo.releaseNotesHistory')}
                            </Typography>
                        </AccordionDetails>
                    </Accordion>
                </Paper>
            </Box>

            {/* Bottom safe area */}
            <Box sx={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
        </Box>
    );
}
