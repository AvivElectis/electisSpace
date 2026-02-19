/**
 * Store Assignment Component
 * 
 * @description Component for assigning a user to stores within a company.
 * Allows selecting specific stores or granting access to all stores.
 * Includes role selection and feature toggles per store.
 */
import {
    Box,
    Typography,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Checkbox,
    FormGroup,
    FormLabel,
    FormControlLabel,
    Alert,
    CircularProgress,
    Chip,
    Paper,
    IconButton,
    Tooltip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { companyService, type CompanyStore } from '@shared/infrastructure/services/companyService';

// Available features
const AVAILABLE_FEATURES = [
    { id: 'dashboard', icon: '📊' },
    { id: 'spaces', icon: '🏷️' },
    { id: 'conference', icon: '🎤' },
    { id: 'people', icon: '👥' },
    { id: 'sync', icon: '🔄' },
    { id: 'settings', icon: '⚙️' },
] as const;

// Store roles (from lowest to highest privilege)
const STORE_ROLES = ['STORE_VIEWER', 'STORE_EMPLOYEE', 'STORE_MANAGER', 'STORE_ADMIN'] as const;
type StoreRole = typeof STORE_ROLES[number];

// Company roles
const COMPANY_ROLES = ['VIEWER', 'STORE_VIEWER', 'STORE_ADMIN', 'COMPANY_ADMIN'] as const;
type CompanyRole = typeof COMPANY_ROLES[number];

/** Store assignment data */
export interface StoreAssignmentData {
    storeId: string;
    storeName?: string;
    storeCode?: string;
    role: StoreRole;
    features: string[];
}

interface StoreAssignmentProps {
    /** Company ID to load stores from */
    companyId: string;
    /** Company role determines some defaults */
    companyRole: CompanyRole;
    /** Whether user has access to all stores */
    allStoresAccess: boolean;
    /** Callback when all stores access changes */
    onAllStoresAccessChange: (allStores: boolean) => void;
    /** Current store assignments */
    assignments: StoreAssignmentData[];
    /** Callback when assignments change */
    onAssignmentsChange: (assignments: StoreAssignmentData[]) => void;
    /** Whether the component is disabled */
    disabled?: boolean;
    /** Default role for new assignments */
    defaultRole?: StoreRole;
    /** Default features for new assignments */
    defaultFeatures?: string[];
    /** Company-level enabled features — filters which features are shown */
    companyEnabledFeatures?: string[];
}

export function StoreAssignment({
    companyId,
    companyRole,
    allStoresAccess,
    onAllStoresAccessChange,
    assignments,
    onAssignmentsChange,
    disabled = false,
    defaultRole = 'STORE_VIEWER',
    defaultFeatures = ['dashboard'],
    companyEnabledFeatures,
}: StoreAssignmentProps) {
    const { t } = useTranslation();

    // State
    const [stores, setStores] = useState<CompanyStore[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch stores when company changes
    const fetchStores = useCallback(async () => {
        if (!companyId) {
            setStores([]);
            return;
        }
        
        try {
            setLoading(true);
            setError(null);
            const response = await companyService.getStores(companyId, { limit: 100 });
            // API returns {stores: [...]} not {data: [...]}
            setStores(response?.stores || []);
        } catch (err) {
            console.error('[StoreAssignment] Failed to fetch stores:', err);
            setError(t('settings.stores.fetchError', 'Failed to load stores'));
            setStores([]); // Ensure stores is empty array on error
        } finally {
            setLoading(false);
        }
    }, [companyId, t]);

    useEffect(() => {
        fetchStores();
    }, [fetchStores]);

    // Filter features by what's enabled at the company/store level
    // Dashboard, sync, and settings are always available
    const ALWAYS_AVAILABLE = ['dashboard', 'sync', 'settings'];
    const visibleFeatures = companyEnabledFeatures
        ? AVAILABLE_FEATURES.filter(f => ALWAYS_AVAILABLE.includes(f.id) || companyEnabledFeatures.includes(f.id))
        : AVAILABLE_FEATURES;

    // All feature IDs for elevated roles (only enabled ones)
    const ALL_FEATURES = visibleFeatures.map(f => f.id);

    // Guard against undefined arrays
    const safeAssignments = assignments || [];
    const safeStores = stores || [];
    const availableStores = safeStores.filter(
        store => !safeAssignments.some(a => a.storeId === store.id)
    );

    // Add a new store assignment
    const handleAddStore = (storeId: string) => {
        const store = safeStores.find(s => s.id === storeId);
        if (!store) return;

        // Use all features for elevated roles
        const effectiveFeatures = (defaultRole === 'STORE_MANAGER' || defaultRole === 'STORE_ADMIN')
            ? [...ALL_FEATURES]
            : [...defaultFeatures];

        const newAssignment: StoreAssignmentData = {
            storeId: store.id,
            storeName: store.name,
            storeCode: store.code,
            role: defaultRole,
            features: effectiveFeatures
        };

        onAssignmentsChange([...safeAssignments, newAssignment]);
    };

    // Remove a store assignment
    const handleRemoveStore = (storeId: string) => {
        onAssignmentsChange(safeAssignments.filter(a => a.storeId !== storeId));
    };

    // Update a store assignment's role
    const handleRoleChange = (storeId: string, role: StoreRole) => {
        onAssignmentsChange(
            safeAssignments.map(a => {
                if (a.storeId !== storeId) return a;
                // Auto-enable all features for manager/admin roles
                const features = (role === 'STORE_MANAGER' || role === 'STORE_ADMIN')
                    ? [...ALL_FEATURES]
                    : a.features;
                return { ...a, role, features };
            })
        );
    };

    // Toggle a feature for a store assignment
    const handleFeatureToggle = (storeId: string, featureId: string) => {
        onAssignmentsChange(
            safeAssignments.map(a => {
                if (a.storeId !== storeId) return a;
                
                // Dashboard is always required
                if (featureId === 'dashboard') return a;

                const hasFeature = a.features.includes(featureId);
                return {
                    ...a,
                    features: hasFeature
                        ? a.features.filter(f => f !== featureId)
                        : [...a.features, featureId]
                };
            })
        );
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 2 }}>
                <CircularProgress size={20} />
                <Typography color="text.secondary">
                    {t('common.loading', 'Loading stores...')}
                </Typography>
            </Box>
        );
    }

    if (error) {
        return (
            <Alert severity="error" sx={{ mb: 2 }}>
                {error}
            </Alert>
        );
    }

    if (!companyId) {
        return (
            <Alert severity="info">
                {t('settings.users.selectCompanyFirst', 'Please select a company first.')}
            </Alert>
        );
    }

    if (safeStores.length === 0) {
        return (
            <Alert severity="warning">
                {t('settings.users.noStoresInCompany', 'This company has no stores. Create stores first.')}
            </Alert>
        );
    }

    // Derive allStoresAccess from company role
    const isAllStoresRole = companyRole === 'COMPANY_ADMIN' || companyRole === 'STORE_ADMIN';

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Individual Store Assignments */}
            {!isAllStoresRole && (
                <>
                    {/* Add Store Selector */}
                    {availableStores.length > 0 && (
                        <FormControl fullWidth size="small" disabled={disabled}>
                            <InputLabel>{t('settings.users.addStore', 'Add Store')}</InputLabel>
                            <Select
                                value=""
                                label={t('settings.users.addStore', 'Add Store')}
                                onChange={(e) => handleAddStore(e.target.value)}
                            >
                                {availableStores.map(store => (
                                    <MenuItem key={store.id} value={store.id}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Chip 
                                                label={store.code} 
                                                size="small" 
                                                variant="outlined"
                                                sx={{ fontFamily: 'monospace' }}
                                            />
                                            <Typography>{store.name}</Typography>
                                        </Box>
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}

                    {/* Store Assignments List */}
                    {safeAssignments.length === 0 ? (
                        <Alert severity="info" sx={{ mt: 1 }}>
                            {t('settings.users.noStoresAssigned', 'No stores assigned. Select stores above.')}
                        </Alert>
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {assignments.map(assignment => (
                                <Paper 
                                    key={assignment.storeId} 
                                    variant="outlined" 
                                    sx={{ p: 2 }}
                                >
                                    {/* Store Header */}
                                    <Box sx={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between', 
                                        alignItems: 'center',
                                        mb: 2
                                    }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Chip 
                                                label={assignment.storeCode} 
                                                size="small" 
                                                color="primary"
                                                variant="outlined"
                                                sx={{ fontFamily: 'monospace' }}
                                            />
                                            <Typography variant="subtitle2">
                                                {assignment.storeName}
                                            </Typography>
                                        </Box>
                                        <Tooltip title={t('common.remove', 'Remove')}>
                                            <IconButton 
                                                size="small" 
                                                color="error"
                                                onClick={() => handleRemoveStore(assignment.storeId)}
                                                disabled={disabled}
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>

                                    {/* Role Selector */}
                                    <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                                        <InputLabel>{t('settings.users.storeRole', 'Store Role')}</InputLabel>
                                        <Select
                                            value={assignment.role}
                                            label={t('settings.users.storeRole', 'Store Role')}
                                            onChange={(e) => handleRoleChange(
                                                assignment.storeId, 
                                                e.target.value as StoreRole
                                            )}
                                            disabled={disabled}
                                        >
                                            {STORE_ROLES.map(role => (
                                                <MenuItem key={role} value={role}>
                                                    {t(`roles.${role.toLowerCase()}`, role)}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>

                                    {/* Features */}
                                    <FormControl component="fieldset">
                                        <FormLabel component="legend">
                                            <Typography variant="caption" color="text.secondary">
                                                {t('settings.users.features', 'Features')}
                                            </Typography>
                                        </FormLabel>
                                        <FormGroup row>
                                            {visibleFeatures.map(feature => (
                                                <FormControlLabel
                                                    key={feature.id}
                                                    control={
                                                        <Checkbox
                                                            checked={assignment.features.includes(feature.id)}
                                                            onChange={() => handleFeatureToggle(
                                                                assignment.storeId, 
                                                                feature.id
                                                            )}
                                                            disabled={disabled || feature.id === 'dashboard'}
                                                            size="small"
                                                        />
                                                    }
                                                    label={
                                                        <Box sx={{ 
                                                            display: 'flex', 
                                                            alignItems: 'center', 
                                                            gap: 0.5 
                                                        }}>
                                                            <span>{feature.icon}</span>
                                                            <Typography variant="body2">
                                                                {t(`navigation.${feature.id}`, feature.id)}
                                                            </Typography>
                                                        </Box>
                                                    }
                                                />
                                            ))}
                                        </FormGroup>
                                    </FormControl>
                                </Paper>
                            ))}
                        </Box>
                    )}
                </>
            )}

            {/* All Stores Access Info */}
            {isAllStoresRole && (
                <Alert severity="success">
                    {t('settings.users.allStoresAccessInfo',
                        'User will have access to all current and future stores in this company.')}
                </Alert>
            )}
        </Box>
    );
}

export default StoreAssignment;
