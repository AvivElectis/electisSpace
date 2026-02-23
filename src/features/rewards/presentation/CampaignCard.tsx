import {
    Card,
    CardContent,
    CardActions,
    Typography,
    Chip,
    Stack,
    Box,
    IconButton,
    Tooltip,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import LabelIcon from '@mui/icons-material/Label';
import { useTranslation } from 'react-i18next';
import type { RewardsCampaign } from '../domain/types';
import { STATUS_COLORS } from '../domain/types';

interface CampaignCardProps {
    campaign: RewardsCampaign;
    onEdit: (campaign: RewardsCampaign) => void;
    onDelete: (campaign: RewardsCampaign) => void;
    onActivate: (campaign: RewardsCampaign) => void;
    onPause: (campaign: RewardsCampaign) => void;
    onComplete: (campaign: RewardsCampaign) => void;
}

export function CampaignCard({ campaign, onEdit, onDelete, onActivate, onPause, onComplete }: CampaignCardProps) {
    const { t, i18n } = useTranslation();
    const isHebrew = i18n.language === 'he';
    
    const displayName = isHebrew && campaign.nameHe ? campaign.nameHe : campaign.name;
    
    const formatDate = (dateStr?: string | null) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString(isHebrew ? 'he-IL' : 'en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    return (
        <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Typography variant="h6" component="div" noWrap sx={{ flex: 1 }}>
                        {displayName}
                    </Typography>
                    <Chip
                        label={t(`rewards.status.${campaign.status}`)}
                        color={STATUS_COLORS[campaign.status]}
                        size="small"
                    />
                </Stack>
                
                {campaign.description && (
                    <Typography variant="body2" color="text.secondary" mb={1} sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                    }}>
                        {campaign.description}
                    </Typography>
                )}
                
                <Stack spacing={0.5} mt={1}>
                    <Typography variant="caption" color="text.secondary">
                        {t('rewards.startDate')}: {formatDate(campaign.startDate)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {t('rewards.endDate')}: {formatDate(campaign.endDate)}
                    </Typography>
                    <Box display="flex" alignItems="center" gap={0.5}>
                        <LabelIcon fontSize="small" color="action" />
                        <Typography variant="caption" color="text.secondary">
                            {t('rewards.labelsCount', { count: campaign.labelCodes.length })}
                        </Typography>
                    </Box>
                    {campaign.discountType && (
                        <Chip
                            label={t(`rewards.discountType.${campaign.discountType}`)}
                            size="small"
                            variant="outlined"
                            sx={{ alignSelf: 'flex-start' }}
                        />
                    )}
                </Stack>
            </CardContent>
            
            <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 1.5 }}>
                <Stack direction="row" spacing={0.5}>
                    {(campaign.status === 'DRAFT' || campaign.status === 'SCHEDULED' || campaign.status === 'PAUSED') && (
                        <Tooltip title={t('rewards.actions.activate')}>
                            <IconButton size="small" color="success" onClick={() => onActivate(campaign)}>
                                <PlayArrowIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                    {campaign.status === 'ACTIVE' && (
                        <Tooltip title={t('rewards.actions.pause')}>
                            <IconButton size="small" color="warning" onClick={() => onPause(campaign)}>
                                <PauseIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                    {(campaign.status === 'ACTIVE' || campaign.status === 'PAUSED') && (
                        <Tooltip title={t('rewards.actions.complete')}>
                            <IconButton size="small" onClick={() => onComplete(campaign)}>
                                <CheckCircleIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                </Stack>
                <Stack direction="row" spacing={0.5}>
                    <Tooltip title={t('common.edit')}>
                        <IconButton size="small" onClick={() => onEdit(campaign)}>
                            <EditIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title={t('common.delete')}>
                        <IconButton size="small" color="error" onClick={() => onDelete(campaign)}>
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </CardActions>
        </Card>
    );
}
