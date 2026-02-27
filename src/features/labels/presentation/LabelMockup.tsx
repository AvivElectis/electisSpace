import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface LabelMockupProps {
    /** Base64 data URL for the dithered image (with data:image/png;base64, prefix) */
    imageSrc: string;
    /** Native display width in pixels */
    displayWidth: number;
    /** Native display height in pixels */
    displayHeight: number;
    /** Label model name (e.g. "Newton 2.9") */
    modelName?: string;
    /** AIMS colorType (e.g. "BINARY", "TERNARY_RED") */
    colorType?: string;
}

/**
 * Realistic ESL (Electronic Shelf Label) mockup that renders the dithered
 * preview image inside a visual frame resembling the physical label housing.
 */
export function LabelMockup({
    imageSrc,
    displayWidth,
    displayHeight,
    modelName,
    colorType,
}: LabelMockupProps) {
    const { t } = useTranslation();

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
            {/* Label housing — dark plastic casing */}
            <Box
                sx={{
                    p: '10px',
                    bgcolor: '#2a2a2a',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow:
                        '0 6px 20px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06)',
                    maxWidth: '100%',
                    width: 'fit-content',
                }}
            >
                {/* Inner bezel — recessed display area */}
                <Box
                    sx={{
                        p: '2px',
                        bgcolor: '#1a1a1a',
                        borderRadius: '4px',
                        border: '1px solid #383838',
                    }}
                >
                    {/* E-ink display */}
                    <Box
                        component="img"
                        src={imageSrc}
                        alt={t('imageLabels.dialog.altLabelPreview', 'Label preview mockup')}
                        sx={{
                            display: 'block',
                            width: Math.min(displayWidth, 400),
                            aspectRatio: `${displayWidth} / ${displayHeight}`,
                            maxWidth: '100%',
                            height: 'auto',
                            borderRadius: '2px',
                            imageRendering: 'pixelated',
                        }}
                    />
                </Box>

                {/* LED indicator */}
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        mt: '6px',
                    }}
                >
                    <Box
                        sx={{
                            width: 5,
                            height: 5,
                            borderRadius: '50%',
                            bgcolor: '#3a3a3a',
                            border: '1px solid #4a4a4a',
                        }}
                    />
                </Box>
            </Box>

            {/* Label info */}
            <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
                {[modelName, `${displayWidth}×${displayHeight}`, colorType]
                    .filter(Boolean)
                    .join(' — ')}
            </Typography>
        </Box>
    );
}
