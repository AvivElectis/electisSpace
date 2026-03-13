import {
    Box,
    Stack,
    Typography,
    Button,
    Paper,
    IconButton,
    Alert,
    Tooltip,
} from '@mui/material';
import UploadIcon from '@mui/icons-material/Upload';
import DeleteIcon from '@mui/icons-material/Delete';
import ImageIcon from '@mui/icons-material/Image';
import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { SettingsData } from '../domain/types';
import { MAX_LOGO_SIZE, ALLOWED_LOGO_FORMATS } from '../domain/types';

interface LogoSettingsTabProps {
    settings: SettingsData;
    onUpdate: (updates: Partial<SettingsData>) => void;
}

/**
 * Logo Settings Tab
 * Upload and manage application logos
 */
export function LogoSettingsTab({ settings, onUpdate }: LogoSettingsTabProps) {
    const { t } = useTranslation();
    const [error, setError] = useState<string | null>(null);
    const fileInput1 = useRef<HTMLInputElement>(null);
    const fileInput2 = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (logoIndex: 1 | 2, file: File) => {
        setError(null);

        if (!ALLOWED_LOGO_FORMATS.includes(file.type)) {
            setError(t('settings.invalidLogoFormat'));
            return;
        }

        if (file.size > MAX_LOGO_SIZE) {
            setError(t('settings.logoTooLarge', { size: MAX_LOGO_SIZE / 1024 / 1024 }));
            return;
        }

        try {
            const reader = new FileReader();
            reader.onerror = () => {
                setError(t('settings.logoUploadFailed'));
            };
            reader.onload = (e) => {
                const base64 = e.target?.result as string;
                onUpdate({
                    logos: {
                        ...settings.logos,
                        [`logo${logoIndex}`]: base64,
                    }
                });
            };
            reader.readAsDataURL(file);
        } catch (err) {
            setError(t('settings.logoUploadFailed'));
        }
    };

    const handleDelete = (logoIndex: 1 | 2) => {
        const newLogos = { ...settings.logos };
        delete newLogos[`logo${logoIndex}` as keyof typeof newLogos];
        onUpdate({ logos: newLogos });
    };

    const renderLogoCard = (logoIndex: 1 | 2, inputRef: React.RefObject<HTMLInputElement | null>) => {
        const logoKey = `logo${logoIndex}` as const;
        const logo = settings.logos[logoKey];
        const label = logoIndex === 1 ? t('settings.mainLogo') : t('settings.secondaryLogo');

        return (
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                    <Typography variant="subtitle2" fontWeight={600}>{label}</Typography>
                    <Stack direction="row" gap={0.5}>
                        <input
                            ref={inputRef}
                            type="file"
                            accept={ALLOWED_LOGO_FORMATS.join(',')}
                            style={{ display: 'none' }}
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(logoIndex, file);
                            }}
                        />
                        <Button
                            size="small"
                            variant="outlined"
                            startIcon={<UploadIcon />}
                            onClick={() => inputRef.current?.click()}
                        >
                            {logo ? t('settings.replaceLogo') : t('settings.uploadLogo')}
                        </Button>
                        {logo && (
                            <Tooltip title={t('common.delete')}>
                                <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => handleDelete(logoIndex)}
                                >
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Stack>
                </Stack>

                {logo ? (
                    <Box
                        component="img"
                        src={logo}
                        alt={label}
                        sx={{
                            width: '100%',
                            maxHeight: 160,
                            objectFit: 'contain',
                            bgcolor: 'background.default',
                            borderRadius: 1,
                            p: 2,
                        }}
                    />
                ) : (
                    <Box
                        sx={{
                            height: 160,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: 'background.default',
                            borderRadius: 1,
                            border: '2px dashed',
                            borderColor: 'divider',
                            gap: 1,
                        }}
                    >
                        <ImageIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
                        <Typography variant="body2" color="text.secondary">
                            {t('settings.noLogoUploaded')}
                        </Typography>
                    </Box>
                )}
            </Paper>
        );
    };

    return (
        <Box sx={{ px: 2, py: 1, maxWidth: 600, mx: 'auto' }}>
            <Stack gap={2}>
                <Alert severity="info" sx={{ py: 0, px: 2 }}>
                    <Typography variant="body2">{t('settings.appearInHeader')}</Typography>
                    <Typography variant="caption" color="text.secondary">{t('settings.recommendedFormat')}</Typography>
                </Alert>

                {error && (
                    <Alert severity="error" onClose={() => setError(null)} sx={{ py: 0, px: 2 }}>
                        {error}
                    </Alert>
                )}

                {renderLogoCard(1, fileInput1)}
                {renderLogoCard(2, fileInput2)}
            </Stack>
        </Box>
    );
}
