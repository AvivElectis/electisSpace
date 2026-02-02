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
    FormControlLabel,
    InputLabel,
    Select,
    MenuItem,
    Checkbox,
    FormGroup,
    FormLabel,
    Switch,
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
const COMPANY_ROLES = ['VIEWER', 'COMPANY_ADMIN'] as const;
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
    defaultFeatures = ['dashboard']
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
            setStores(response.data);
        } catch (err) {
            console.error('Failed to fetch stores:', err);
            setError(t('settings.stores.fetchError', 'Failed to load stores'));
        } finally {
            setLoading(false);
        }
    }, [companyId, t]);

    useEffect(() => {
        fetchStores();
    }, [fetchStores]);

    // Get stores not yet assigned
    const availableStores = stores.filter(
        store => !assignments.some(a => a.storeId === store.id)
    );

    // Add a new store assignment
    const handleAddStore = (storeId: string) => {
        const store = stores.find(s => s.id === storeId);
        if (!store) return;

        const newAssignment: StoreAssignmentData = {
            storeId: store.id,
            storeName: store.name,
            storeCode: store.code,
            role: defaultRole,
            features: [...defaultFeatures]
        };

        onAssignmentsChange([...assignments, newAssignment]);
    };

    // Remove a store assignment
    const handleRemoveStore = (storeId: string) => {
        onAssignmentsChange(assignments.filter(a => a.storeId !== storeId));
    };

    // Update a store assignment's role
    const handleRoleChange = (storeId: string, role: StoreRole) => {
        onAssignmentsChange(
            assignments.map(a => 
                a.storeId === storeId ? { ...a, role } : a
            )
        );
    };

    // Toggle a feature for a store assignment
    const handleFeatureToggle = (storeId: string, featureId: string) => {
        onAssignmentsChange(
            assignments.map(a => {
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

    // Handle all stores access toggle
    const handleAllStoresToggle = (checked: boolean) => {
        onAllStoresAccessChange(checked);
        if (checked) {
            // Clear individual assignments when granting all stores access
            onAssignmentsChange([]);
        }
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

    if (stores.length === 0) {
        return (
            <Alert severity="warning">
                {t('settings.users.noStoresInCompany', 'This company has no stores. Create stores first.')}
            </Alert>
        );
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* All Stores Access Toggle */}
            {companyRole === 'COMPANY_ADMIN' && (
                <FormControlLabel
                    control={
                        <Switch
                            checked={allStoresAccess}
                            onChange={(e) => handleAllStoresToggle(e.target.checked)}
                            disabled={disabled}
                        />
                    }
                    label={
                        <Typography variant="body2">
                            {t('settings.users.allStoresAccess', 'Access to all stores in company')}
                        </Typography>
                    }
                />
            )}

            {/* Individual Store Assignments */}
            {!allStoresAccess && (
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
                    {assignments.length === 0 ? (
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
                                            {AVAILABLE_FEATURES.map(feature => (
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
            {allStoresAccess && (
                <Alert severity="success">
                    {t('settings.users.allStoresAccessInfo', 
                        'User will have access to all current and future stores in this company.')}
                </Alert>
            )}
        </Box>
    );
}

export default StoreAssignment;
