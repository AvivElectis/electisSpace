import { ToggleButton, ToggleButtonGroup, Typography, Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { DITHER_ENGINES } from '../domain/imageTypes';
import type { DitherEngine } from '../domain/imageTypes';

interface DitherEngineSelectorProps {
    value: DitherEngine;
    onChange: (engine: DitherEngine) => void;
    disabled?: boolean;
}

export function DitherEngineSelector({ value, onChange, disabled }: DitherEngineSelectorProps) {
    const { t } = useTranslation();

    const handleChange = (_: React.MouseEvent<HTMLElement>, newEngine: DitherEngine | null) => {
        if (newEngine) onChange(newEngine);
    };

    const selected = DITHER_ENGINES.find((e) => e.engine === value);

    return (
        <Box>
            <Typography variant="subtitle2" gutterBottom>
                {t('imageLabels.dialog.dithering.title', 'Color Conversion')}
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                <ToggleButtonGroup
                    value={value}
                    exclusive
                    onChange={handleChange}
                    size="small"
                    dir="ltr"
                    disabled={disabled}
                    aria-label={t('imageLabels.dialog.dithering.ariaGroup', 'color conversion engine')}
                    sx={{ flexWrap: 'wrap', justifyContent: 'center' }}
                >
                    {DITHER_ENGINES.map(({ engine, labelKey }) => (
                        <ToggleButton key={engine} value={engine} sx={{ gap: 0.5, textTransform: 'none' }}>
                            {t(`imageLabels.dialog.dithering.${labelKey}`)}
                        </ToggleButton>
                    ))}
                </ToggleButtonGroup>
            </Box>
            {selected && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
                    {t(`imageLabels.dialog.dithering.${selected.labelKey}Help`)}
                </Typography>
            )}
        </Box>
    );
}
