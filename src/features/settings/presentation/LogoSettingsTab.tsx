import {
    Box,
    Stack,
    Typography,
    Button,
    Card,
    CardContent,
    CardActions,
    IconButton,
    Alert,
} from '@mui/material';
import UploadIcon from '@mui/icons-material/Upload';
import DeleteIcon from '@mui/icons-material/Delete';
import { useState, useRef } from 'react';
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
    const [error, setError] = useState<string | null>(null);
    const fileInput1 = useRef<HTMLInputElement>(null);
    const fileInput2 = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (logoIndex: 1 | 2, file: File) => {
        setError(null);

        // Validate file type
        if (!ALLOWED_LOGO_FORMATS.includes(file.type)) {
            setError('Only PNG and JPEG formats are allowed');
            return;
        }

        // Validate file size
        if (file.size > MAX_LOGO_SIZE) {
            setError(`File size must be less than ${MAX_LOGO_SIZE / 1024 / 1024}MB`);
            return;
        }

        try {
            // Convert to base64
            const reader = new FileReader();
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
            setError(`Failed to upload logo: ${err}`);
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

        return (
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Logo {logoIndex}
                    </Typography>

                    {logo ? (
                        <Box
                            component="img"
                            src={logo}
                            alt={`Logo ${logoIndex}`}
                            sx={{
                                width: '100%',
                                maxHeight: 200,
                                objectFit: 'contain',
                                bgcolor: 'background.default',
                                borderRadius: 1,
                                p: 2,
                            }}
                        />
                    ) : (
                        <Box
                            sx={{
                                height: 200,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                bgcolor: 'background.default',
                                borderRadius: 1,
                                border: '2px dashed',
                                borderColor: 'divider',
                            }}
                        >
                            <Typography variant="body2" color="text.secondary">
                                No logo uploaded
                            </Typography>
                        </Box>
                    )}
                </CardContent>
                <CardActions>
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
                        startIcon={<UploadIcon />}
                        onClick={() => inputRef.current?.click()}
                    >
                        {logo ? 'Replace' : 'Upload'}
                    </Button>
                    {logo && (
                        <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(logoIndex)}
                        >
                            <DeleteIcon />
                        </IconButton>
                    )}
                </CardActions>
            </Card>
        );
    };

    return (
        <Box sx={{ px: 3 }}>
            <Stack spacing={3}>
                {/* Info */}
                <Alert severity="info">
                    Upload up to 2 logos for your application. Supported formats: PNG, JPEG. Max size: 2MB.
                </Alert>

                {/* Error */}
                {error && (
                    <Alert severity="error" onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                {/* Logo 1 */}
                {renderLogoCard(1, fileInput1)}

                {/* Logo 2 */}
                {renderLogoCard(2, fileInput2)}
            </Stack>
        </Box>
    );
}
