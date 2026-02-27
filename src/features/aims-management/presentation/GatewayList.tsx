/**
 * Gateway List Component
 *
 * Displays gateways in a table with status indicators.
 * Follows the same data display patterns as other feature pages.
 */

import { useEffect } from 'react';
import {
    Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Paper, Typography, Chip, IconButton, Tooltip, Alert, Button,
    Card, CardContent, Skeleton,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import InfoIcon from '@mui/icons-material/Info';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import DeleteIcon from '@mui/icons-material/Delete';
import RouterIcon from '@mui/icons-material/Router';
import { useTranslation } from 'react-i18next';
import { useGateways } from '../application/useGateways';
import { useGatewayManagement } from '../application/useGatewayManagement';
import { useAuthContext } from '@features/auth/application/useAuthContext';

interface GatewayListProps {
    storeId: string;
    onSelectGateway?: (mac: string) => void;
}

export function GatewayList({ storeId, onSelectGateway }: GatewayListProps) {
    const { t } = useTranslation();
    const { hasStoreRole } = useAuthContext();
    const canManage = hasStoreRole('STORE_ADMIN');

    const { gateways, gatewaysLoading, gatewaysError, fetchGateways } = useGateways(storeId);
    const { rebootGateway, deregisterGateways, loading: actionLoading } = useGatewayManagement(storeId);

    useEffect(() => { fetchGateways(); }, [fetchGateways]);

    const handleReboot = async (mac: string) => {
        if (!confirm(t('aims.confirmReboot'))) return;
        await rebootGateway(mac);
        fetchGateways(true);
    };

    const handleDeregister = async (mac: string) => {
        if (!confirm(t('aims.confirmDeregister'))) return;
        await deregisterGateways([mac]);
        fetchGateways(true);
    };

    if (gatewaysLoading && gateways.length === 0) {
        return (
            <Box>
                {[1, 2, 3].map((i) => (
                    <Skeleton key={i} variant="rectangular" height={52} sx={{ mb: 1, borderRadius: 1 }} />
                ))}
            </Box>
        );
    }

    if (gatewaysError) {
        return <Alert severity="error" action={<Button onClick={() => fetchGateways(true)}>{t('common.retry')}</Button>}>{gatewaysError}</Alert>;
    }

    const onlineCount = gateways.filter((g: any) => {
        const status = (g.status || g.networkStatus || '').toUpperCase();
        return status === 'ONLINE' || status === 'CONNECTED';
    }).length;

    if (gateways.length === 0) {
        return (
            <Card>
                <CardContent sx={{ py: 8, textAlign: 'center' }}>
                    <RouterIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                        {t('aims.noGateways')}
                    </Typography>
                </CardContent>
            </Card>
        );
    }

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1">
                    {t('aims.gateways')} ({onlineCount}/{gateways.length} {t('aims.online')})
                </Typography>
                <Tooltip title={t('common.refresh')}>
                    <IconButton onClick={() => fetchGateways(true)} disabled={gatewaysLoading}>
                        <RefreshIcon />
                    </IconButton>
                </Tooltip>
            </Box>

            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>{t('aims.macAddress')}</TableCell>
                            <TableCell>{t('aims.ipAddress')}</TableCell>
                            <TableCell>{t('aims.status')}</TableCell>
                            <TableCell>{t('aims.model')}</TableCell>
                            <TableCell>{t('aims.firmware')}</TableCell>
                            <TableCell align="right">{t('aims.labels')}</TableCell>
                            <TableCell align="right">{t('aims.actions')}</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {gateways.map((gw: any) => {
                            const mac = gw.mac || gw.macAddress || gw.gatewayId || '';
                            const statusRaw = (gw.status || gw.networkStatus || '').toUpperCase();
                            const isOnline = statusRaw === 'ONLINE' || statusRaw === 'CONNECTED';
                            return (
                                <TableRow key={mac} hover>
                                    <TableCell><Typography variant="body2" fontFamily="monospace">{mac}</Typography></TableCell>
                                    <TableCell>{gw.ip || gw.ipAddress || '\u2014'}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={isOnline ? t('aims.online') : t('aims.offline')}
                                            color={isOnline ? 'success' : 'error'}
                                            size="small"
                                            variant="outlined"
                                        />
                                    </TableCell>
                                    <TableCell>{gw.model || '\u2014'}</TableCell>
                                    <TableCell>{gw.firmwareVersion || gw.version || '\u2014'}</TableCell>
                                    <TableCell align="right">{gw.connectedLabelCount ?? gw.labelCount ?? '\u2014'}</TableCell>
                                    <TableCell align="right">
                                        <Tooltip title={t('aims.viewDetails')}>
                                            <IconButton size="small" onClick={() => onSelectGateway?.(mac)}>
                                                <InfoIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        {canManage && (
                                            <>
                                                <Tooltip title={t('aims.reboot')}>
                                                    <IconButton size="small" onClick={() => handleReboot(mac)} disabled={actionLoading}>
                                                        <RestartAltIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title={t('aims.deregister')}>
                                                    <IconButton size="small" onClick={() => handleDeregister(mac)} disabled={actionLoading} color="error">
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}
