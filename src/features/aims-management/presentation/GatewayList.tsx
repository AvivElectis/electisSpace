/**
 * Gateway List Component
 *
 * Displays gateways in a table (desktop) or card layout (mobile).
 * Follows the same responsive patterns as PeopleTable and ConferencePage.
 */

import { useEffect, useState } from 'react';
import {
    Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Paper, Typography, Chip, IconButton, Tooltip, Alert, Button,
    Card, CardContent, Skeleton, Stack, useMediaQuery, useTheme, Collapse,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import InfoIcon from '@mui/icons-material/Info';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import DeleteIcon from '@mui/icons-material/Delete';
import RouterIcon from '@mui/icons-material/Router';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useTranslation } from 'react-i18next';
import { useGateways } from '../application/useGateways';
import { useGatewayManagement } from '../application/useGatewayManagement';
import { useAuthContext } from '@features/auth/application/useAuthContext';

interface GatewayListProps {
    storeId: string;
    onSelectGateway?: (mac: string) => void;
}

function getGatewayFields(gw: any) {
    const mac = gw.mac || gw.macAddress || gw.gatewayId || '';
    const statusRaw = (gw.status || gw.networkStatus || '').toUpperCase();
    const isOnline = statusRaw === 'ONLINE' || statusRaw === 'CONNECTED';
    const ip = gw.ip || gw.ipAddress || '\u2014';
    const model = gw.model || '\u2014';
    const firmware = gw.firmwareVersion || gw.version || '\u2014';
    const labelCount = gw.connectedLabelCount ?? gw.labelCount ?? '\u2014';
    return { mac, statusRaw, isOnline, ip, model, firmware, labelCount };
}

export function GatewayList({ storeId, onSelectGateway }: GatewayListProps) {
    const { t } = useTranslation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const { hasStoreRole, isAppViewer } = useAuthContext();
    const canManage = hasStoreRole('STORE_ADMIN') && !isAppViewer;

    const { gateways, gatewaysLoading, gatewaysError, fetchGateways } = useGateways(storeId);
    const { rebootGateway, deregisterGateways, loading: actionLoading } = useGatewayManagement(storeId);

    const [expandedMac, setExpandedMac] = useState<string | null>(null);

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
                    <Skeleton key={i} variant="rectangular" height={isMobile ? 80 : 52} sx={{ mb: 1, borderRadius: 1 }} />
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

            {isMobile ? (
                /* ── Mobile: Card-based layout ── */
                <Stack gap={1.5}>
                    {gateways.map((gw: any) => {
                        const { mac, isOnline, ip, model, firmware, labelCount } = getGatewayFields(gw);
                        const isExpanded = expandedMac === mac;

                        return (
                            <Card key={mac} variant="outlined">
                                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                    {/* Compact header — always visible */}
                                    <Stack
                                        direction="row"
                                        alignItems="center"
                                        gap={1}
                                        onClick={() => setExpandedMac(isExpanded ? null : mac)}
                                        sx={{ cursor: 'pointer' }}
                                    >
                                        <Chip
                                            label={isOnline ? t('aims.online') : t('aims.offline')}
                                            color={isOnline ? 'success' : 'error'}
                                            size="small"
                                            variant="outlined"
                                        />
                                        <Typography variant="body2" fontFamily="monospace" sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {mac}
                                        </Typography>
                                        {isExpanded ? <ExpandLessIcon fontSize="small" color="action" /> : <ExpandMoreIcon fontSize="small" color="action" />}
                                    </Stack>

                                    {/* Expanded details */}
                                    <Collapse in={isExpanded}>
                                        <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                                            {/* 2-column field grid */}
                                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5, mb: 1.5 }}>
                                                <Box>
                                                    <Typography variant="caption" color="text.secondary">{t('aims.ipAddress')}</Typography>
                                                    <Typography variant="body2">{ip}</Typography>
                                                </Box>
                                                <Box>
                                                    <Typography variant="caption" color="text.secondary">{t('aims.model')}</Typography>
                                                    <Typography variant="body2">{model}</Typography>
                                                </Box>
                                                <Box>
                                                    <Typography variant="caption" color="text.secondary">{t('aims.firmware')}</Typography>
                                                    <Typography variant="body2">{firmware}</Typography>
                                                </Box>
                                                <Box>
                                                    <Typography variant="caption" color="text.secondary">{t('aims.labels')}</Typography>
                                                    <Typography variant="body2">{labelCount}</Typography>
                                                </Box>
                                            </Box>

                                            {/* Action buttons */}
                                            <Stack direction="row" gap={1} flexWrap="wrap">
                                                <Button
                                                    size="medium"
                                                    variant="outlined"
                                                    startIcon={<InfoIcon />}
                                                    onClick={() => onSelectGateway?.(mac)}
                                                >
                                                    {t('aims.viewDetails')}
                                                </Button>
                                                {canManage && (
                                                    <>
                                                        <Button
                                                            size="medium"
                                                            variant="outlined"
                                                            startIcon={<RestartAltIcon />}
                                                            onClick={() => handleReboot(mac)}
                                                            disabled={actionLoading}
                                                        >
                                                            {t('aims.reboot')}
                                                        </Button>
                                                        <Button
                                                            size="medium"
                                                            variant="outlined"
                                                            color="error"
                                                            startIcon={<DeleteIcon />}
                                                            onClick={() => handleDeregister(mac)}
                                                            disabled={actionLoading}
                                                        >
                                                            {t('aims.deregister')}
                                                        </Button>
                                                    </>
                                                )}
                                            </Stack>
                                        </Box>
                                    </Collapse>
                                </CardContent>
                            </Card>
                        );
                    })}
                </Stack>
            ) : (
                /* ── Desktop: Table layout ── */
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
                                const { mac, isOnline, ip, model, firmware, labelCount } = getGatewayFields(gw);
                                return (
                                    <TableRow key={mac} hover>
                                        <TableCell><Typography variant="body2" fontFamily="monospace">{mac}</Typography></TableCell>
                                        <TableCell>{ip}</TableCell>
                                        <TableCell>
                                            <Chip
                                                label={isOnline ? t('aims.online') : t('aims.offline')}
                                                color={isOnline ? 'success' : 'error'}
                                                size="small"
                                                variant="outlined"
                                            />
                                        </TableCell>
                                        <TableCell>{model}</TableCell>
                                        <TableCell>{firmware}</TableCell>
                                        <TableCell align="right">{labelCount}</TableCell>
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
            )}
        </Box>
    );
}
