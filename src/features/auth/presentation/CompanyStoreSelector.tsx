/**
 * Company/Store Selector Component
 *
 * Responsive button + grouped dropdown for switching between stores.
 * Uses atomic setActiveContext for safe cross-company transitions.
 */

import { useState, useMemo } from 'react';
import {
    Box,
    Button,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Divider,
    Typography,
    CircularProgress,
    IconButton,
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import StoreIcon from '@mui/icons-material/Store';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import CheckIcon from '@mui/icons-material/Check';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { useAuthContext } from '@features/auth/application/useAuthContext';
import { useTranslation } from 'react-i18next';

interface CompanyStoreSelectorProps {
    /** Compact mode for smaller screens */
    compact?: boolean;
}

export function CompanyStoreSelector({ compact = false }: CompanyStoreSelectorProps) {
    const { t } = useTranslation();
    const {
        activeCompany,
        activeStore,
        companies,
        stores,
        isPlatformAdmin,
        setActiveContext,
        isLoading,
    } = useAuthContext();

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [switching, setSwitching] = useState(false);
    const open = Boolean(anchorEl);

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    /** Atomic store switch — always uses setActiveContext for safety */
    const handleStoreSelect = async (companyId: string, storeId: string) => {
        if (storeId === activeStore?.id) {
            handleClose();
            return;
        }

        setSwitching(true);
        handleClose();
        try {
            await setActiveContext(companyId, storeId);
        } finally {
            setSwitching(false);
        }
    };

    // Build grouped store list: companies with their stores
    // Company type from authService does NOT have `stores` property.
    // `stores` is a separate array from useAuthContext with `companyId` on each store.
    const groupedStores = useMemo(() => {
        return companies.map(company => ({
            company,
            stores: stores.filter(s => s.companyId === company.id),
        }));
    }, [companies, stores]);

    // Don't show if user has no companies
    if (companies.length === 0 && !isPlatformAdmin) {
        return null;
    }

    // Single company + single store: show static text only
    const totalStores = groupedStores.reduce((sum, g) => sum + g.stores.length, 0);
    if (companies.length === 1 && totalStores <= 1 && !isPlatformAdmin) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <StoreIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary" noWrap>
                    {activeStore?.name || activeCompany?.name || ''}
                </Typography>
            </Box>
        );
    }

    const chevronIcon = switching
        ? <CircularProgress size={16} />
        : open
            ? <KeyboardArrowUpIcon sx={{ fontSize: 20 }} />
            : <KeyboardArrowDownIcon sx={{ fontSize: 20 }} />;

    return (
        <>
            {/* Mobile: icon-only button */}
            <IconButton
                onClick={handleClick}
                disabled={isLoading || switching}
                sx={{
                    display: { xs: 'flex', sm: 'none' },
                    width: 42,
                    height: 42,
                    background: 'linear-gradient(135deg, rgba(13,71,161,0.06) 0%, rgba(13,71,161,0.12) 100%)',
                    border: '1px solid',
                    borderColor: open ? 'primary.main' : 'divider',
                    '&:hover': {
                        borderColor: 'primary.main',
                        background: 'linear-gradient(135deg, rgba(13,71,161,0.10) 0%, rgba(13,71,161,0.18) 100%)',
                    },
                }}
            >
                {switching ? <CircularProgress size={20} /> : <StoreIcon fontSize="small" color="primary" />}
            </IconButton>

            {/* Tablet: compact store name only */}
            <Button
                onClick={handleClick}
                disabled={isLoading || switching}
                endIcon={chevronIcon}
                sx={{
                    display: { xs: 'none', sm: compact ? 'inline-flex' : 'none', md: compact ? 'none' : 'none' },
                    textTransform: 'none',
                    px: 1.5,
                    py: 0.75,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: open ? 'primary.main' : 'divider',
                    background: 'linear-gradient(135deg, rgba(13,71,161,0.04) 0%, rgba(13,71,161,0.10) 100%)',
                    boxShadow: open ? 2 : 1,
                    '&::after': { display: 'none' },
                    '&:hover': {
                        borderColor: 'primary.main',
                        background: 'linear-gradient(135deg, rgba(13,71,161,0.08) 0%, rgba(13,71,161,0.14) 100%)',
                        boxShadow: 2,
                    },
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <StoreIcon fontSize="small" color="primary" />
                    <Typography variant="body2" fontWeight={700} noWrap>
                        {activeStore?.name || t('selector.selectStore', 'Select Store')}
                    </Typography>
                </Box>
            </Button>

            {/* Desktop: full company/store button */}
            <Button
                onClick={handleClick}
                disabled={isLoading || switching}
                endIcon={chevronIcon}
                sx={{
                    display: { xs: 'none', sm: compact ? 'none' : 'inline-flex', md: 'inline-flex' },
                    textTransform: 'none',
                    px: 2,
                    py: 0.75,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: open ? 'primary.main' : 'divider',
                    background: 'linear-gradient(135deg, rgba(13,71,161,0.04) 0%, rgba(13,71,161,0.10) 100%)',
                    boxShadow: open ? 2 : 1,
                    minWidth: 180,
                    maxWidth: 300,
                    justifyContent: 'space-between',
                    '&::after': { display: 'none' },
                    '&:hover': {
                        borderColor: 'primary.main',
                        background: 'linear-gradient(135deg, rgba(13,71,161,0.08) 0%, rgba(13,71,161,0.14) 100%)',
                        boxShadow: 2,
                    },
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, overflow: 'hidden' }}>
                    <StoreIcon fontSize="small" color="primary" />
                    <Box sx={{ textAlign: 'start', overflow: 'hidden' }}>
                        {activeCompany && (
                            <Typography
                                variant="caption"
                                sx={{
                                    display: 'block',
                                    color: 'text.secondary',
                                    fontSize: '0.65rem',
                                    fontWeight: 600,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    lineHeight: 1.2,
                                }}
                                noWrap
                            >
                                {activeCompany.name}
                            </Typography>
                        )}
                        <Typography variant="body2" fontWeight={700} color="primary" noWrap>
                            {activeStore?.name || t('selector.selectStore', 'Select Store')}
                        </Typography>
                    </Box>
                </Box>
            </Button>

            {/* Grouped dropdown menu */}
            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                slotProps={{
                    paper: {
                        sx: {
                            minWidth: 280,
                            maxWidth: 360,
                            maxHeight: 400,
                            borderRadius: '16px',
                            mt: 1,
                        }
                    }
                }}
            >
                {/* Platform Admin Badge */}
                {isPlatformAdmin && [
                    <Box key="admin-badge" sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AdminPanelSettingsIcon fontSize="small" color="primary" />
                        <Typography variant="caption" color="primary" fontWeight={600}>
                            {t('selector.platformAdmin', 'Platform Administrator')}
                        </Typography>
                    </Box>,
                    <Divider key="admin-divider" />,
                ]}

                {/* Grouped stores by company */}
                {groupedStores.map((group, groupIndex) => [
                    // Company header (non-clickable)
                    <Box
                        key={`company-${group.company.id}`}
                        sx={{
                            px: 2,
                            py: 0.75,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            mt: groupIndex > 0 ? 0.5 : 0,
                        }}
                    >
                        <BusinessIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                        <Typography
                            variant="caption"
                            sx={{
                                fontWeight: 700,
                                color: 'text.secondary',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                            }}
                        >
                            {group.company.name}
                            {group.company.code ? ` (${group.company.code})` : ''}
                        </Typography>
                    </Box>,

                    // Stores under this company
                    ...(group.stores.length > 0
                        ? group.stores.map((store) => (
                            <MenuItem
                                key={store.id}
                                onClick={() => handleStoreSelect(group.company.id, store.id)}
                                selected={store.id === activeStore?.id}
                                sx={{
                                    pl: 4,
                                    borderRadius: '10px',
                                    mx: 1,
                                    '&.Mui-selected': {
                                        bgcolor: 'primary.50',
                                        '&:hover': { bgcolor: 'primary.100' },
                                    },
                                }}
                            >
                                <ListItemIcon>
                                    {store.id === activeStore?.id ? (
                                        <CheckIcon fontSize="small" color="primary" />
                                    ) : (
                                        <StoreIcon fontSize="small" color="action" />
                                    )}
                                </ListItemIcon>
                                <ListItemText
                                    primary={store.name}
                                    secondary={`${t('selector.code', 'Code')}: ${store.code}`}
                                    primaryTypographyProps={{
                                        fontWeight: store.id === activeStore?.id ? 700 : 400,
                                    }}
                                />
                            </MenuItem>
                        ))
                        : [
                            <MenuItem key={`no-stores-${group.company.id}`} disabled sx={{ pl: 4 }}>
                                <ListItemText
                                    primary={t('selector.noStores', 'No stores available')}
                                    sx={{ color: 'text.disabled' }}
                                />
                            </MenuItem>,
                        ]
                    ),

                    // Divider between groups (except last)
                    ...(groupIndex < groupedStores.length - 1
                        ? [<Divider key={`divider-${group.company.id}`} sx={{ my: 0.5 }} />]
                        : []
                    ),
                ])}
            </Menu>
        </>
    );
}

export default CompanyStoreSelector;
