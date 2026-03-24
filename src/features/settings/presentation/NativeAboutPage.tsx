/**
 * NativeAboutPage
 *
 * Full-page About screen for native (Android/iOS) builds.
 * - Title set via useSetNativeTitle (NativeShell provides the app bar)
 * - Centered app icon, app name, version, platform info
 * - Release notes for current version
 * - Collapsible version history
 */

import {
    Box,
    Typography,
    Paper,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Chip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HistoryIcon from '@mui/icons-material/History';
import NewReleasesIcon from '@mui/icons-material/NewReleases';
import { useTranslation } from 'react-i18next';
import { useNativePlatform } from '@shared/presentation/hooks/useNativePlatform';
import { NativePage } from '@shared/presentation/native/NativePage';
import { useSetNativeTitle } from '@shared/presentation/native/NativePageTitleContext';

declare const __APP_VERSION__: string;

export function NativeAboutPage() {
    const { t } = useTranslation();
    const { platform } = useNativePlatform();

    useSetNativeTitle(t('nativeSettings.about'), true);

    const platformLabel = platform === 'android' ? 'Android'
        : platform === 'ios' ? 'iOS'
        : platform === 'electron' ? 'Desktop'
        : 'Web';

    return (
        <NativePage>
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
        </NativePage>
    );
}
