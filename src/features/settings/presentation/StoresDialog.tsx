/**
 * Stores Dialog
 * 
 * @description Dialog for managing stores within a company.
 * Lists all stores with options to add, edit, and delete.
 * Displays store details including sync status and entity counts.
 */
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Chip,
    CircularProgress,
    Stack,
    Tooltip,
    Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SyncIcon from '@mui/icons-material/Sync';
import SyncDisabledIcon from '@mui/icons-material/SyncDisabled';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useConfirmDialog } from '@shared/presentation/hooks/useConfirmDialog';
import {
    companyService,
    type Company,
    type CompanyStore
} from '@shared/infrastructure/services/companyService';

// Lazy load store dialog - using default export
const StoreDialog = lazy(() => import('./StoreDialog'));

interface StoresDialogProps {
    open: boolean;
    onClose: () => void;
    company: Company;
}

export function StoresDialog({ open, onClose, company }: StoresDialogProps) {
    const { t } = useTranslation();
    const { confirm, ConfirmDialog } = useConfirmDialog();

    // State
    const [stores, setStores] = useState<CompanyStore[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Dialog State
    const [storeDialogOpen, setStoreDialogOpen] = useState(false);
    const [selectedStore, setSelectedStore] = useState<CompanyStore | null>(null);

    // Fetch stores
    const fetchStores = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await companyService.getStores(company.id);
            setStores(response.data);
        } catch (err) {
            console.error('Failed to fetch stores:', err);
            setError(t('settings.stores.fetchError', 'Failed to load stores'));
        } finally {
            setLoading(false);
        }
    }, [company.id, t]);

    useEffect(() => {
        if (open) {
            fetchStores();
        }
    }, [open, fetchStores]);

    // Handlers
    const handleAdd = () => {
        setSelectedStore(null);
        setStoreDialogOpen(true);
    };

    const handleEdit = (store: CompanyStore) => {
        setSelectedStore(store);
        setStoreDialogOpen(true);
    };

    const handleDelete = async (store: CompanyStore) => {
        const entityCount = 
            (store._count?.spaces || 0) + 
            (store._count?.people || 0) + 
            (store._count?.conferenceRooms || 0);

        const confirmMessage = entityCount > 0
            ? t('settings.stores.deleteConfirmWithData', `Are you sure you want to delete "${store.name}"? This will also delete ${entityCount} items (spaces, people, conference rooms).`)
            : t('settings.stores.deleteConfirm', `Are you sure you want to delete "${store.name}"?`);

        const confirmed = await confirm({
            title: t('settings.stores.deleteTitle', 'Delete Store'),
            message: confirmMessage,
            confirmLabel: t('common.delete', 'Delete'),
            severity: 'error'
        });

        if (confirmed) {
            try {
                await companyService.deleteStore(store.id);
                fetchStores();
            } catch (err) {
                console.error('Failed to delete store:', err);
                setError(t('settings.stores.deleteError', 'Failed to delete store'));
            }
        }
    };

    const handleStoreDialogClose = () => {
        setStoreDialogOpen(false);
        setSelectedStore(null);
    };

    const handleStoreSave = async () => {
        setStoreDialogOpen(false);
        setSelectedStore(null);
        fetchStores();
    };

    // Format date
    const formatDate = (dateString: string | null) => {
        if (!dateString) return '—';
        return new Date(dateString).toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <Dialog 
            open={open} 
            onClose={onClose}
            maxWidth="md"
            fullWidth
        >
            <DialogTitle>
                <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="h6">
                        {t('settings.stores.dialogTitle', 'Manage Stores')}
                    </Typography>
                    <Chip label={company.code} size="small" variant="outlined" />
                    <Typography variant="body2" color="text.secondary">
                        {company.name}
                    </Typography>
                </Stack>
            </DialogTitle>

            <DialogContent dividers>
                {/* Error Alert */}
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                {/* Header with Add Button */}
                <Stack 
                    direction="row" 
                    justifyContent="space-between" 
                    alignItems="center"
                    sx={{ mb: 2 }}
                >
                    <Typography variant="subtitle2" color="text.secondary">
                        {t('settings.stores.count', '{{count}} store(s)', { count: stores.length })}
                    </Typography>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={handleAdd}
                        size="small"
                    >
                        {t('settings.stores.addStore', 'Add Store')}
                    </Button>
                </Stack>

                {/* Stores Table */}
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>{t('settings.stores.code', 'Code')}</TableCell>
                                <TableCell>{t('settings.stores.name', 'Name')}</TableCell>
                                <TableCell>{t('settings.stores.timezone', 'Timezone')}</TableCell>
                                <TableCell align="center">{t('settings.stores.syncStatus', 'Sync')}</TableCell>
                                <TableCell align="center">{t('settings.stores.entities', 'Entities')}</TableCell>
                                <TableCell>{t('settings.stores.lastSync', 'Last Sync')}</TableCell>
                                <TableCell align="right">{t('common.actions', 'Actions')}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                        <CircularProgress size={32} />
                                    </TableCell>
                                </TableRow>
                            ) : stores.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                        <Typography color="text.secondary">
                                            {t('settings.stores.noStores', 'No stores yet. Create your first store!')}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                stores.map((store) => (
                                    <TableRow key={store.id} hover>
                                        <TableCell>
                                            <Chip 
                                                label={store.code} 
                                                size="small" 
                                                variant="outlined"
                                                sx={{ fontFamily: 'monospace' }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight="medium">
                                                {store.name}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" color="text.secondary">
                                                {store.timezone}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Tooltip
                                                title={store.syncEnabled
                                                    ? t('settings.stores.syncEnabled', 'Sync enabled')
                                                    : t('settings.stores.syncDisabled', 'Sync disabled')}
                                            >
                                                {store.syncEnabled ? (
                                                    <SyncIcon color="success" fontSize="small" />
                                                ) : (
                                                    <SyncDisabledIcon color="disabled" fontSize="small" />
                                                )}
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Stack 
                                                direction="row" 
                                                spacing={0.5} 
                                                justifyContent="center"
                                            >
                                                <Tooltip title={t('settings.stores.spaces', 'Spaces')}>
                                                    <Chip 
                                                        label={`🏷️ ${store._count?.spaces || 0}`} 
                                                        size="small" 
                                                        variant="outlined"
                                                    />
                                                </Tooltip>
                                                <Tooltip title={t('settings.stores.people', 'People')}>
                                                    <Chip 
                                                        label={`👥 ${store._count?.people || 0}`} 
                                                        size="small" 
                                                        variant="outlined"
                                                    />
                                                </Tooltip>
                                                <Tooltip title={t('settings.stores.conferenceRooms', 'Conference')}>
                                                    <Chip 
                                                        label={`🎤 ${store._count?.conferenceRooms || 0}`} 
                                                        size="small" 
                                                        variant="outlined"
                                                    />
                                                </Tooltip>
                                            </Stack>
                                        </TableCell>
                                        <TableCell>
                                            <Stack direction="row" alignItems="center" spacing={0.5}>
                                                <AccessTimeIcon fontSize="small" color="action" />
                                                <Typography variant="body2" color="text.secondary">
                                                    {formatDate(store.lastAimsSyncAt)}
                                                </Typography>
                                            </Stack>
                                        </TableCell>
                                        <TableCell align="right">
                                            <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                                <Tooltip title={t('common.edit', 'Edit')}>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleEdit(store)}
                                                    >
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title={t('common.delete', 'Delete')}>
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={() => handleDelete(store)}
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose}>
                    {t('common.close', 'Close')}
                </Button>
            </DialogActions>

            {/* Confirm Dialog */}
            <ConfirmDialog />

            {/* Store Dialog (Create/Edit) */}
            <Suspense fallback={null}>
                {storeDialogOpen && (
                    <StoreDialog
                        open={true}
                        onClose={handleStoreDialogClose}
                        onSave={handleStoreSave}
                        companyId={company.id}
                        store={selectedStore}
                    />
                )}
            </Suspense>
        </Dialog>
    );
}

export default StoresDialog;
