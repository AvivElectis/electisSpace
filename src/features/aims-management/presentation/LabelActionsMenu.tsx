/**
 * Label Actions Menu
 *
 * Row of action buttons for individual label operations: blink, LED, NFC, heartbeat.
 */

import { useTranslation } from 'react-i18next';
import { Box, IconButton, Tooltip } from '@mui/material';
import FlashlightOnOutlined from '@mui/icons-material/FlashlightOnOutlined';
import LightModeOutlined from '@mui/icons-material/LightModeOutlined';
import NfcOutlined from '@mui/icons-material/NfcOutlined';
import FavoriteBorderOutlined from '@mui/icons-material/FavoriteBorderOutlined';

interface LabelActionsMenuProps {
    labelCode: string;
    onBlink: (code: string) => void;
    onLed: (code: string) => void;
    onNfc: (code: string) => void;
    onHeartbeat: (code: string) => void;
    disabled?: boolean;
}

export function LabelActionsMenu({ labelCode, onBlink, onLed, onNfc, onHeartbeat, disabled }: LabelActionsMenuProps) {
    const { t } = useTranslation();

    return (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title={t('aims.blinkLabel')}>
                <span>
                    <IconButton size="small" onClick={() => onBlink(labelCode)} disabled={disabled}>
                        <FlashlightOnOutlined fontSize="small" />
                    </IconButton>
                </span>
            </Tooltip>
            <Tooltip title={t('aims.ledControl')}>
                <span>
                    <IconButton size="small" onClick={() => onLed(labelCode)} disabled={disabled}>
                        <LightModeOutlined fontSize="small" />
                    </IconButton>
                </span>
            </Tooltip>
            <Tooltip title={t('aims.nfcConfig')}>
                <span>
                    <IconButton size="small" onClick={() => onNfc(labelCode)} disabled={disabled}>
                        <NfcOutlined fontSize="small" />
                    </IconButton>
                </span>
            </Tooltip>
            <Tooltip title={t('aims.forceHeartbeat')}>
                <span>
                    <IconButton size="small" onClick={() => onHeartbeat(labelCode)} disabled={disabled}>
                        <FavoriteBorderOutlined fontSize="small" />
                    </IconButton>
                </span>
            </Tooltip>
        </Box>
    );
}
