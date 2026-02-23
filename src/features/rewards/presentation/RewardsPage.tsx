import { useEffect, useState, useCallback } from 'react';
import {
    Box,
    Typography,
    Button,
    Grid,
    Alert,
    CircularProgress,
    Stack,
    Paper,
    TextField,
    InputAdornment,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import { useTranslation } from 'react-i18next';
import { useRewardsStore } from '../infrastructure/rewardsStore';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { CampaignCard } from './CampaignCard';
import { CampaignDialog } from './CampaignDialog';
import type { RewardsCampaign, CreateCampaignInput, CampaignStatus } from '../domain/types';

export function RewardsPage() {
    const { t } = useTranslation();
    const activeStoreId = useAuthStore((s) => s.activeStoreId);
    const storeId = activeStoreId || '';
    
    const {
        campaigns,
        analytics,
        isLoading,
        error,
        fetchCampaigns,
        fetchAnalytics,
        createCampaign,
        updateCampaign,
        deleteCampaign,
        activateCampaign,
        pauseCampaign,
        completeCampaign,
        clearError,
    } = useRewardsStore();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingCampaign, setEditingCampaign] = useState<RewardsCampaign | null>(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<CampaignStatus | 'ALL'>('ALL');

    useEffect(() => {
        if (storeId) {
            fetchCampaigns(storeId);
            fetchAnalytics(storeId);
        }
    }, [storeId, fetchCampaigns, fetchAnalytics]);

    const handleCreate = useCallback(() => {
        setEditingCampaign(null);
        setDialogOpen(true);
    }, []);

    const handleEdit = useCallback((campaign: RewardsCampaign) => {
        setEditingCampaign(campaign);
        setDialogOpen(true);
    }, []);

    const handleSave = useCallback(async (data: CreateCampaignInput) => {
        if (editingCampaign) {
            await updateCampaign(editingCampaign.id, { ...data, storeId });
        } else {
            await createCampaign(data);
        }
        fetchAnalytics(storeId);
    }, [editingCampaign, storeId, updateCampaign, createCampaign, fetchAnalytics]);

    const handleDelete = useCallback(async (campaign: RewardsCampaign) => {
        if (window.confirm(t('rewards.confirmDelete'))) {
            await deleteCampaign(storeId, campaign.id);
            fetchAnalytics(storeId);
        }
    }, [storeId, deleteCampaign, fetchAnalytics, t]);

    const handleActivate = useCallback(async (campaign: RewardsCampaign) => {
        await activateCampaign(storeId, campaign.id);
        fetchAnalytics(storeId);
    }, [storeId, activateCampaign, fetchAnalytics]);

    const handlePause = useCallback(async (campaign: RewardsCampaign) => {
        await pauseCampaign(storeId, campaign.id);
        fetchAnalytics(storeId);
    }, [storeId, pauseCampaign, fetchAnalytics]);

    const handleComplete = useCallback(async (campaign: RewardsCampaign) => {
        await completeCampaign(storeId, campaign.id);
        fetchAnalytics(storeId);
    }, [storeId, completeCampaign, fetchAnalytics]);

    const filteredCampaigns = campaigns.filter((c) => {
        const matchesSearch = !search || 
            c.name.toLowerCase().includes(search.toLowerCase()) ||
            (c.nameHe && c.nameHe.includes(search));
        const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    if (!storeId) {
        return (
            <Box p={3}>
                <Alert severity="info">{t('rewards.selectStore')}</Alert>
            </Box>
        );
    }

    return (
        <Box p={3}>
            {/* Header */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                <Stack direction="row" alignItems="center" spacing={1}>
                    <LocalOfferIcon color="primary" />
                    <Typography variant="h5" fontWeight="bold">
                        {t('rewards.title')}
                    </Typography>
                </Stack>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleCreate}
                >
                    {t('rewards.createCampaign')}
                </Button>
            </Stack>

            {/* Analytics Summary */}
            {analytics && (
                <Stack direction="row" spacing={2} mb={3} flexWrap="wrap" useFlexGap>
                    <Paper sx={{ px: 2, py: 1.5, minWidth: 120 }}>
                        <Typography variant="caption" color="text.secondary">{t('rewards.analytics.total')}</Typography>
                        <Typography variant="h6">{analytics.totalCampaigns}</Typography>
                    </Paper>
                    <Paper sx={{ px: 2, py: 1.5, minWidth: 120 }}>
                        <Typography variant="caption" color="text.secondary">{t('rewards.analytics.active')}</Typography>
                        <Typography variant="h6" color="success.main">{analytics.activeCampaigns}</Typography>
                    </Paper>
                    <Paper sx={{ px: 2, py: 1.5, minWidth: 120 }}>
                        <Typography variant="caption" color="text.secondary">{t('rewards.analytics.labelsInRewards')}</Typography>
                        <Typography variant="h6" color="primary">{analytics.totalLabelsInRewards}</Typography>
                    </Paper>
                </Stack>
            )}

            {/* Filters */}
            <Stack direction="row" spacing={2} mb={3} flexWrap="wrap" useFlexGap>
                <TextField
                    size="small"
                    placeholder={t('common.search')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon fontSize="small" />
                                </InputAdornment>
                            ),
                        },
                    }}
                    sx={{ minWidth: 220 }}
                />
                <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>{t('rewards.filterByStatus')}</InputLabel>
                    <Select
                        value={statusFilter}
                        label={t('rewards.filterByStatus')}
                        onChange={(e) => setStatusFilter(e.target.value as CampaignStatus | 'ALL')}
                    >
                        <MenuItem value="ALL">{t('common.all')}</MenuItem>
                        <MenuItem value="DRAFT">{t('rewards.status.DRAFT')}</MenuItem>
                        <MenuItem value="SCHEDULED">{t('rewards.status.SCHEDULED')}</MenuItem>
                        <MenuItem value="ACTIVE">{t('rewards.status.ACTIVE')}</MenuItem>
                        <MenuItem value="PAUSED">{t('rewards.status.PAUSED')}</MenuItem>
                        <MenuItem value="COMPLETED">{t('rewards.status.COMPLETED')}</MenuItem>
                        <MenuItem value="CANCELLED">{t('rewards.status.CANCELLED')}</MenuItem>
                    </Select>
                </FormControl>
            </Stack>

            {/* Error */}
            {error && (
                <Alert severity="error" onClose={clearError} sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {/* Loading */}
            {isLoading && (
                <Box display="flex" justifyContent="center" py={4}>
                    <CircularProgress />
                </Box>
            )}

            {/* Campaign Grid */}
            {!isLoading && filteredCampaigns.length === 0 && (
                <Box textAlign="center" py={6}>
                    <LocalOfferIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                    <Typography color="text.secondary">
                        {campaigns.length === 0 ? t('rewards.noCampaigns') : t('rewards.noMatchingCampaigns')}
                    </Typography>
                </Box>
            )}

            {!isLoading && filteredCampaigns.length > 0 && (
                <Grid container spacing={2}>
                    {filteredCampaigns.map((campaign) => (
                        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={campaign.id}>
                            <CampaignCard
                                campaign={campaign}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                                onActivate={handleActivate}
                                onPause={handlePause}
                                onComplete={handleComplete}
                            />
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* Dialog */}
            <CampaignDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                onSave={handleSave}
                campaign={editingCampaign}
                storeId={storeId}
            />
        </Box>
    );
}
