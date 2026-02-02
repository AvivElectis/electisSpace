/**
 * Company/Store Selector Component
 * 
 * Dropdown selector for switching between companies and stores.
 * Used in the application header to let users switch context.
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
    Chip,
    CircularProgress,
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import StoreIcon from '@mui/icons-material/Store';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import CheckIcon from '@mui/icons-material/Check';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { useAuthContext } from '@features/auth/application/useAuthContext';
import { useTranslation } from 'react-i18next';

interface CompanyStoreSelectorProps {
    /** Compact mode for mobile */
    compact?: boolean;
}

export function CompanyStoreSelector({ compact = false }: CompanyStoreSelectorProps) {
    const { t } = useTranslation();
    const {
        activeCompany,
        activeStore,
        companies,
        storesInActiveCompany,
        isPlatformAdmin,
        setActiveCompany,
        setActiveStore,
        isLoading,
    } = useAuthContext();

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [switching, setSwitching] = useState(false);
    const open = Boolean(anchorEl);

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleCompanySelect = async (companyId: string) => {
        if (companyId === activeCompany?.id) return;
        
        setSwitching(true);
        try {
            await setActiveCompany(companyId);
        } finally {
            setSwitching(false);
        }
    };

    const handleStoreSelect = async (storeId: string) => {
        if (storeId === activeStore?.id) return;
        
        setSwitching(true);
        try {
            await setActiveStore(storeId);
        } finally {
            setSwitching(false);
            handleClose();
        }
    };

    // Display text
    const displayText = useMemo(() => {
        if (!activeCompany && !activeStore) {
            return t('selector.noContext', 'Select Context');
        }
        
        if (compact) {
            return activeStore?.name || activeCompany?.name || '';
        }
        
        const parts: string[] = [];
        if (activeCompany) parts.push(activeCompany.name);
        if (activeStore) parts.push(activeStore.name);
        return parts.join(' / ');
    }, [activeCompany, activeStore, compact, t]);

    // Don't show if user has no companies
    if (companies.length === 0 && !isPlatformAdmin) {
        return null;
    }

    // Show single company/store without selector if only one option
    if (companies.length === 1 && storesInActiveCompany.length <= 1 && !isPlatformAdmin) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <StoreIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary" noWrap>
                    {displayText}
                </Typography>
            </Box>
        );
    }

    return (
        <>
            <Button
                onClick={handleClick}
                endIcon={switching ? <CircularProgress size={16} /> : <KeyboardArrowDownIcon />}
                disabled={isLoading || switching}
                sx={{
                    textTransform: 'none',
                    color: 'text.primary',
                    minWidth: compact ? 'auto' : 200,
                    maxWidth: compact ? 150 : 300,
                    justifyContent: 'space-between',
                    px: 1.5,
                    py: 0.75,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    '&:hover': {
                        borderColor: 'primary.main',
                        bgcolor: 'action.hover',
                    },
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, overflow: 'hidden' }}>
                    <BusinessIcon fontSize="small" color="action" />
                    <Typography variant="body2" noWrap>
                        {displayText}
                    </Typography>
                </Box>
            </Button>

            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                slotProps={{
                    paper: {
                        sx: { minWidth: 280, maxHeight: 400 }
                    }
                }}
            >
                {/* Platform Admin Badge */}
                {isPlatformAdmin && (
                    <>
                        <Box sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <AdminPanelSettingsIcon fontSize="small" color="primary" />
                            <Typography variant="caption" color="primary">
                                {t('selector.platformAdmin', 'Platform Administrator')}
                            </Typography>
                        </Box>
                        <Divider />
                    </>
                )}

                {/* Companies Section */}
                {companies.length > 1 && (
                    <>
                        <Typography
                            variant="overline"
                            sx={{ px: 2, py: 0.5, display: 'block', color: 'text.secondary' }}
                        >
                            {t('selector.companies', 'Companies')}
                        </Typography>
                        {companies.map((company) => (
                            <MenuItem
                                key={company.id}
                                onClick={() => handleCompanySelect(company.id)}
                                selected={company.id === activeCompany?.id}
                            >
                                <ListItemIcon>
                                    {company.id === activeCompany?.id ? (
                                        <CheckIcon fontSize="small" color="primary" />
                                    ) : (
                                        <BusinessIcon fontSize="small" />
                                    )}
                                </ListItemIcon>
                                <ListItemText
                                    primary={company.name}
                                    secondary={company.code}
                                />
                                {company.role === 'COMPANY_ADMIN' && (
                                    <Chip
                                        label={t('selector.admin', 'Admin')}
                                        size="small"
                                        color="primary"
                                        variant="outlined"
                                        sx={{ ml: 1 }}
                                    />
                                )}
                            </MenuItem>
                        ))}
                        <Divider sx={{ my: 1 }} />
                    </>
                )}

                {/* Stores Section */}
                {storesInActiveCompany.length > 0 && (
                    <>
                        <Typography
                            variant="overline"
                            sx={{ px: 2, py: 0.5, display: 'block', color: 'text.secondary' }}
                        >
                            {activeCompany
                                ? t('selector.storesIn', 'Stores in {{company}}', { company: activeCompany.name })
                                : t('selector.stores', 'Stores')}
                        </Typography>
                        {storesInActiveCompany.map((store) => (
                            <MenuItem
                                key={store.id}
                                onClick={() => handleStoreSelect(store.id)}
                                selected={store.id === activeStore?.id}
                            >
                                <ListItemIcon>
                                    {store.id === activeStore?.id ? (
                                        <CheckIcon fontSize="small" color="primary" />
                                    ) : (
                                        <StoreIcon fontSize="small" />
                                    )}
                                </ListItemIcon>
                                <ListItemText
                                    primary={store.name}
                                    secondary={`${t('selector.code', 'Code')}: ${store.code}`}
                                />
                                {store.role === 'STORE_ADMIN' && (
                                    <Chip
                                        label={t('selector.admin', 'Admin')}
                                        size="small"
                                        color="secondary"
                                        variant="outlined"
                                        sx={{ ml: 1 }}
                                    />
                                )}
                            </MenuItem>
                        ))}
                    </>
                )}

                {/* No stores message */}
                {storesInActiveCompany.length === 0 && activeCompany && (
                    <MenuItem disabled>
                        <ListItemText
                            primary={t('selector.noStores', 'No stores available')}
                            sx={{ color: 'text.secondary' }}
                        />
                    </MenuItem>
                )}
            </Menu>
        </>
    );
}

export default CompanyStoreSelector;
