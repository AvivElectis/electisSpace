/**
 * Label Detail View Dialog
 *
 * Shows detailed label info, actions (blink/LED/NFC/heartbeat),
 * and tabbed history (status, alive, operation, article).
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button,
    Typography, Box, Tabs, Tab, Chip, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper, CircularProgress,
    IconButton, Grid, Alert, Snackbar,
} from '@mui/material';
import Close from '@mui/icons-material/Close';
import { LabelActionsMenu } from './LabelActionsMenu';
import { useLabelActions } from '../application/useLabelActions';

interface LabelDetailViewProps {
    open: boolean;
    onClose: () => void;
    label: any;
    storeId: string;
}

function getStatusColor(status?: string): 'success' | 'warning' | 'error' | 'default' {
    if (!status) return 'default';
    const s = status.toUpperCase();
    if (s === 'ONLINE' || s === 'SUCCESS' || s === 'COMPLETED') return 'success';
    if (s === 'PROCESSING' || s === 'PENDING') return 'warning';
    if (s === 'OFFLINE' || s === 'TIMEOUT' || s === 'FAIL' || s === 'FAILED' || s === 'ERROR') return 'error';
    return 'default';
}

function getBatteryColor(battery?: string): 'success' | 'warning' | 'error' | 'default' {
    if (!battery) return 'default';
    const b = battery.toUpperCase();
    if (b === 'GOOD' || b === 'NORMAL') return 'success';
    if (b === 'LOW') return 'warning';
    if (b === 'CRITICAL' || b === 'EMPTY') return 'error';
    return 'default';
}

export function LabelDetailView({ open, onClose, label, storeId }: LabelDetailViewProps) {
    const { t, i18n } = useTranslation();
    const isRtl = i18n.language === 'he';
    const [detailTab, setDetailTab] = useState(0);

    const {
        labelDetailData, labelArticleData,
        labelAliveHistory, labelOperationHistory,
        selectedLabelLoading,
        fetchLabelDetail, fetchLabelAliveHistory, fetchLabelOperationHistory,
        handleBlink, handleLed, handleNfc, handleHeartbeat,
        actionLoading, actionError, actionSuccess, clearActionStatus,
    } = useLabelActions(storeId);

    const labelCode = label?.labelCode || label?.code || '';

    useEffect(() => {
        if (open && labelCode) {
            fetchLabelDetail(labelCode);
            setDetailTab(0);
        }
    }, [open, labelCode, fetchLabelDetail]);

    // Fetch tab-specific data when switching tabs
    useEffect(() => {
        if (!open || !labelCode) return;
        if (detailTab === 1) {
            fetchLabelAliveHistory(labelCode);
        } else if (detailTab === 2) {
            fetchLabelOperationHistory(labelCode);
        }
    }, [open, labelCode, detailTab, fetchLabelAliveHistory, fetchLabelOperationHistory]);

    if (!label) return null;

    // Merge detail data with the original label for the most complete view
    const detail = labelDetailData || label;
    const status = detail.status || label.status || '';
    const battery = detail.batteryStatus || detail.battery || label.batteryStatus || label.battery || '';
    const signal = detail.signalStrength || detail.signal || label.signalStrength || label.signal || '';
    const labelType = detail.labelType || detail.type || label.labelType || label.type || '';
    const templateName = detail.templateName || label.templateName || '';
    const gwRaw = detail.gateway || detail.gatewayMac || label.gateway || '';
    const gateway = typeof gwRaw === 'object' ? gwRaw?.name || '' : gwRaw;

    const infoFields = [
        { label: t('aims.labelCode'), value: labelCode, mono: true },
        { label: t('aims.model'), value: labelType },
        { label: t('aims.gateway'), value: gateway, mono: true },
        { label: t('aims.templateName', 'Template'), value: templateName },
        { label: t('aims.firmware', 'Firmware'), value: detail.firmwareVersion },
        { label: t('aims.serialNumber', 'Serial'), value: detail.serialNumber },
    ];

    const handleLedClick = (code: string) => {
        // Simple LED toggle — sends a default blink pattern
        handleLed(code, { color: 'RED', mode: 'BLINK' });
    };

    const handleNfcClick = (code: string) => {
        // For now, send empty NFC URL (clear NFC). A full NFC dialog can be added later.
        handleNfc(code, '');
    };

    return (
        <>
            <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth dir={isRtl ? 'rtl' : 'ltr'}>
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" component="span">
                        {t('aims.labelDetail')}: {labelCode}
                    </Typography>
                    <IconButton onClick={onClose} edge="end" aria-label={t('common.close')}>
                        <Close />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    {selectedLabelLoading && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                            <CircularProgress />
                        </Box>
                    )}

                    {!selectedLabelLoading && (
                        <>
                            {/* Status chips */}
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                                <Chip
                                    label={status || 'Unknown'}
                                    color={getStatusColor(status)}
                                    size="small"
                                    variant="outlined"
                                />
                                {battery && (
                                    <Chip
                                        label={`${t('aims.battery')}: ${battery}`}
                                        color={getBatteryColor(battery)}
                                        size="small"
                                        variant="outlined"
                                    />
                                )}
                                {signal && (
                                    <Chip
                                        label={`${t('aims.signal')}: ${signal}`}
                                        size="small"
                                        variant="outlined"
                                    />
                                )}
                                {labelType && (
                                    <Chip label={labelType} size="small" variant="outlined" />
                                )}
                            </Box>

                            {/* Info grid */}
                            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                                <Grid container spacing={2}>
                                    {infoFields.map((f) => f.value ? (
                                        <Grid size={{ xs: 12, sm: 6 }} key={f.label}>
                                            <Typography variant="caption" color="text.secondary">{f.label}</Typography>
                                            <Typography variant="body2" sx={f.mono ? { fontFamily: 'monospace' } : undefined}>
                                                {String(f.value)}
                                            </Typography>
                                        </Grid>
                                    ) : null)}
                                </Grid>
                            </Paper>

                            {/* Actions */}
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>{t('aims.labelActions')}</Typography>
                                <LabelActionsMenu
                                    labelCode={labelCode}
                                    onBlink={handleBlink}
                                    onLed={handleLedClick}
                                    onNfc={handleNfcClick}
                                    onHeartbeat={handleHeartbeat}
                                    disabled={actionLoading}
                                />
                            </Box>

                            {/* Tabs: Alive History | Operation History | Article */}
                            <Tabs value={detailTab} onChange={(_, v) => setDetailTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                                <Tab label={t('aims.aliveHistory')} />
                                <Tab label={t('aims.statusHistory')} />
                                <Tab label={t('aims.assignedArticle')} />
                            </Tabs>

                            {/* Tab 0: Alive / Heartbeat History */}
                            {detailTab === 0 && (
                                <Box sx={{ mt: 1 }}>
                                    {labelAliveHistory?.content?.length > 0 ? (
                                        <TableContainer component={Paper} variant="outlined">
                                            <Table size="small">
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell>{t('aims.timestamp')}</TableCell>
                                                        <TableCell>{t('aims.status')}</TableCell>
                                                        <TableCell>{t('aims.gateway')}</TableCell>
                                                        <TableCell>{t('aims.signal')}</TableCell>
                                                        <TableCell>{t('aims.battery')}</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {labelAliveHistory.content.map((entry: any, i: number) => (
                                                        <TableRow key={i}>
                                                            <TableCell>
                                                                {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : '\u2014'}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Chip
                                                                    label={entry.status || '\u2014'}
                                                                    color={getStatusColor(entry.status)}
                                                                    size="small"
                                                                    variant="outlined"
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Typography variant="body2" fontFamily="monospace">
                                                                    {(typeof entry.gateway === 'object' ? entry.gateway?.name : entry.gateway) || '\u2014'}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell>{entry.signal ?? '\u2014'}</TableCell>
                                                            <TableCell>{entry.battery ?? '\u2014'}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    ) : (
                                        <Alert severity="info" sx={{ mt: 1 }}>
                                            {t('aims.noHistory')}
                                        </Alert>
                                    )}
                                </Box>
                            )}

                            {/* Tab 1: Operation History */}
                            {detailTab === 1 && (
                                <Box sx={{ mt: 1 }}>
                                    {labelOperationHistory?.content?.length > 0 ? (
                                        <TableContainer component={Paper} variant="outlined">
                                            <Table size="small">
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell>{t('aims.timestamp')}</TableCell>
                                                        <TableCell>{t('aims.status')}</TableCell>
                                                        <TableCell>{t('aims.articleId')}</TableCell>
                                                        <TableCell>{t('aims.batchName')}</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {labelOperationHistory.content.map((entry: any, i: number) => (
                                                        <TableRow key={i}>
                                                            <TableCell>
                                                                {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : '\u2014'}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Chip
                                                                    label={entry.status || '\u2014'}
                                                                    color={getStatusColor(entry.status)}
                                                                    size="small"
                                                                    variant="outlined"
                                                                />
                                                            </TableCell>
                                                            <TableCell>{entry.articleId || '\u2014'}</TableCell>
                                                            <TableCell>{entry.batchName || '\u2014'}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    ) : (
                                        <Alert severity="info" sx={{ mt: 1 }}>
                                            {t('aims.noHistory')}
                                        </Alert>
                                    )}
                                </Box>
                            )}

                            {/* Tab 2: Assigned Article */}
                            {detailTab === 2 && (
                                <Box sx={{ mt: 1 }}>
                                    {labelArticleData ? (
                                        <Paper variant="outlined" sx={{ p: 2 }}>
                                            <Grid container spacing={2}>
                                                {labelArticleData.articleId && (
                                                    <Grid size={{ xs: 12, sm: 6 }}>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {t('aims.articleId')}
                                                        </Typography>
                                                        <Typography variant="body2">{labelArticleData.articleId}</Typography>
                                                    </Grid>
                                                )}
                                                {labelArticleData.articleName && (
                                                    <Grid size={{ xs: 12, sm: 6 }}>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {t('aims.articleName')}
                                                        </Typography>
                                                        <Typography variant="body2">{labelArticleData.articleName}</Typography>
                                                    </Grid>
                                                )}
                                                {labelArticleData.nfcUrl && (
                                                    <Grid size={{ xs: 12 }}>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {t('aims.nfcUrl')}
                                                        </Typography>
                                                        <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                                                            {labelArticleData.nfcUrl}
                                                        </Typography>
                                                    </Grid>
                                                )}
                                            </Grid>
                                        </Paper>
                                    ) : (
                                        <Alert severity="info" sx={{ mt: 1 }}>
                                            {t('common.noData')}
                                        </Alert>
                                    )}
                                </Box>
                            )}
                        </>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={onClose}>{t('common.close')}</Button>
                </DialogActions>
            </Dialog>

            {/* Action feedback snackbar */}
            <Snackbar
                open={!!actionSuccess || !!actionError}
                autoHideDuration={3000}
                onClose={clearActionStatus}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    severity={actionError ? 'error' : 'success'}
                    onClose={clearActionStatus}
                    variant="filled"
                >
                    {actionError || actionSuccess}
                </Alert>
            </Snackbar>
        </>
    );
}
