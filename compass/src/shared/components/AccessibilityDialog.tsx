import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Stack,
    Slider,
    Switch,
    FormControlLabel,
    Box,
    Divider,
    ToggleButton,
    ToggleButtonGroup,
} from '@mui/material';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness';
import { useTranslation } from 'react-i18next';
import { usePreferencesStore } from '../stores/usePreferencesStore';
import type { ThemeMode } from '../theme/theme';

interface AccessibilityDialogProps {
    open: boolean;
    onClose: () => void;
}

const fontSizeMarks = [
    { value: 85, label: 'A' },
    { value: 100, label: 'A' },
    { value: 125, label: 'A' },
    { value: 150, label: 'A' },
];

export function AccessibilityDialog({ open, onClose }: AccessibilityDialogProps) {
    const { t } = useTranslation();
    const {
        themeMode,
        accessibility,
        setThemeMode,
        setFontSize,
        setHighContrast,
        setReducedMotion,
        resetAccessibility,
    } = usePreferencesStore();

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="xs"
            aria-labelledby="accessibility-dialog-title"
        >
            <DialogTitle id="accessibility-dialog-title">
                {t('accessibility.title')}
            </DialogTitle>
            <DialogContent dividers>
                <Stack gap={3}>
                    {/* Theme mode */}
                    <Box>
                        <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                            {t('accessibility.theme')}
                        </Typography>
                        <ToggleButtonGroup
                            value={themeMode}
                            exclusive
                            onChange={(_, val: ThemeMode | null) => {
                                if (val) setThemeMode(val);
                            }}
                            fullWidth
                            size="small"
                            aria-label={t('accessibility.theme')}
                        >
                            <ToggleButton value="light" aria-label={t('accessibility.light')}>
                                <LightModeIcon sx={{ me: 0.5 }} fontSize="small" />
                                {t('accessibility.light')}
                            </ToggleButton>
                            <ToggleButton value="system" aria-label={t('accessibility.system')}>
                                <SettingsBrightnessIcon sx={{ me: 0.5 }} fontSize="small" />
                                {t('accessibility.system')}
                            </ToggleButton>
                            <ToggleButton value="dark" aria-label={t('accessibility.dark')}>
                                <DarkModeIcon sx={{ me: 0.5 }} fontSize="small" />
                                {t('accessibility.dark')}
                            </ToggleButton>
                        </ToggleButtonGroup>
                    </Box>

                    <Divider />

                    {/* Font size */}
                    <Box>
                        <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                            {t('accessibility.fontSize')}
                        </Typography>
                        <Box sx={{ px: 1 }}>
                            <Slider
                                value={accessibility.fontSize}
                                onChange={(_, val) => setFontSize(val as number)}
                                step={null}
                                marks={fontSizeMarks.map((m, i) => ({
                                    ...m,
                                    label: (
                                        <Typography
                                            sx={{ fontSize: [12, 14, 18, 22][i] }}
                                            aria-hidden
                                        >
                                            {m.label}
                                        </Typography>
                                    ),
                                }))}
                                min={85}
                                max={150}
                                aria-label={t('accessibility.fontSize')}
                                aria-valuetext={`${accessibility.fontSize}%`}
                            />
                        </Box>
                    </Box>

                    <Divider />

                    {/* High contrast */}
                    <FormControlLabel
                        control={
                            <Switch
                                checked={accessibility.highContrast}
                                onChange={(e) => setHighContrast(e.target.checked)}
                            />
                        }
                        label={
                            <Box>
                                <Typography variant="subtitle2" fontWeight={600}>
                                    {t('accessibility.highContrast')}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {t('accessibility.highContrastDesc')}
                                </Typography>
                            </Box>
                        }
                    />

                    {/* Reduced motion */}
                    <FormControlLabel
                        control={
                            <Switch
                                checked={accessibility.reducedMotion}
                                onChange={(e) => setReducedMotion(e.target.checked)}
                            />
                        }
                        label={
                            <Box>
                                <Typography variant="subtitle2" fontWeight={600}>
                                    {t('accessibility.reducedMotion')}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {t('accessibility.reducedMotionDesc')}
                                </Typography>
                            </Box>
                        }
                    />
                </Stack>
            </DialogContent>
            <DialogActions sx={{ justifyContent: 'space-between' }}>
                <Button
                    onClick={() => {
                        resetAccessibility();
                        setThemeMode('system');
                    }}
                    color="inherit"
                    size="small"
                >
                    {t('accessibility.reset')}
                </Button>
                <Button onClick={onClose} variant="contained">
                    {t('common.close')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
