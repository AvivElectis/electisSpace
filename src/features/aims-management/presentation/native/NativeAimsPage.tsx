/**
 * NativeAimsPage
 *
 * Native Android AIMS management page.
 * Shows connection status, sync controls, and tab-based sections for
 * Articles, Gateways, Labels, and Templates.
 *
 * Tabs are rendered inline below the chip bar (no separate routes).
 * Tapping an item expands an inline detail card.
 */

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Box,
    Typography,
    Switch,
    FormControlLabel,
    CircularProgress,
    Collapse,
    ButtonBase,
    Alert,
    Select,
    MenuItem,
    FormControl,
} from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

import { NativePage } from '@shared/presentation/native/NativePage';
import { NativeChipBar } from '@shared/presentation/native/NativeChipBar';
import { NativeCard } from '@shared/presentation/native/NativeCard';
import { NativeStatBar } from '@shared/presentation/native/NativeStatBar';
import { NativeStatusBadge } from '@shared/presentation/native/NativeStatusBadge';
import { NativeEmptyState } from '@shared/presentation/native/NativeEmptyState';
import { useSetNativeTitle } from '@shared/presentation/native/NativePageTitleContext';
import { nativeColors, nativeSpacing, nativeSizing } from '@shared/presentation/themes/nativeTokens';

import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { useAimsManagementStore } from '../../infrastructure/aimsManagementStore';
import { useGateways } from '../../application/useGateways';
import { useLabelsOverview } from '../../application/useLabelsOverview';
import { useArticles } from '../../application/useArticles';
import { useTemplates } from '../../application/useTemplates';
import { useSyncStore } from '@features/sync/infrastructure/syncStore';
import { syncApi } from '@shared/infrastructure/services/syncApi';
import { logger } from '@shared/infrastructure/services/logger';

type ActiveTab = 'articles' | 'gateways' | 'labels' | 'templates';

// ---------------------------------------------------------------------------
// Inline expandable item card
// ---------------------------------------------------------------------------

interface ExpandableItemProps {
    primaryText: string;
    secondaryText?: string;
    badge?: { label: string; color: 'success' | 'warning' | 'error' | 'info' };
    detail: React.ReactNode;
    isExpanded: boolean;
    onToggle: () => void;
}

function ExpandableItem({
    primaryText,
    secondaryText,
    badge,
    detail,
    isExpanded,
    onToggle,
}: ExpandableItemProps) {
    return (
        <Box>
            <ButtonBase
                onClick={onToggle}
                sx={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    px: `${nativeSpacing.cardPadding}px`,
                    py: 1.5,
                    minHeight: `${nativeSizing.touchMinHeight}px`,
                    textAlign: 'start',
                }}
            >
                <Box sx={{ flex: 1, overflow: 'hidden' }}>
                    <Typography variant="body2" fontWeight={600} noWrap>
                        {primaryText}
                    </Typography>
                    {secondaryText && (
                        <Typography variant="caption" color="text.secondary" noWrap>
                            {secondaryText}
                        </Typography>
                    )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0, ml: 1 }}>
                    {badge && <NativeStatusBadge label={badge.label} color={badge.color} />}
                    {isExpanded ? (
                        <ExpandLessIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                    ) : (
                        <ExpandMoreIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                    )}
                </Box>
            </ButtonBase>
            <Collapse in={isExpanded} unmountOnExit>
                <Box
                    sx={{
                        px: `${nativeSpacing.cardPadding}px`,
                        pb: 1.5,
                        bgcolor: nativeColors.surface.low,
                    }}
                >
                    {detail}
                </Box>
            </Collapse>
        </Box>
    );
}

// ---------------------------------------------------------------------------
// Item separator
// ---------------------------------------------------------------------------

function ItemDivider() {
    return <Box sx={{ height: 1, bgcolor: nativeColors.surface.low, mx: 2 }} />;
}

// ---------------------------------------------------------------------------
// Detail row helper
// ---------------------------------------------------------------------------

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
    if (value == null || value === '') return null;
    return (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, gap: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                {label}
            </Typography>
            <Typography variant="caption" fontWeight={500} sx={{ textAlign: 'end', wordBreak: 'break-all' }}>
                {String(value)}
            </Typography>
        </Box>
    );
}

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------

interface SectionProps {
    title: string;
    count: number;
    children: React.ReactNode;
    loading?: boolean;
    error?: string | null;
    emptyText?: string;
}

function Section({ title, count, children, loading, error, emptyText }: SectionProps) {
    const { t } = useTranslation();
    return (
        <Box sx={{ mb: `${nativeSpacing.sectionGap}px`, px: `${nativeSpacing.pagePadding}px` }}>
            <Typography
                variant="overline"
                sx={{
                    color: nativeColors.primary.main,
                    fontWeight: 700,
                    lineHeight: 1.2,
                    letterSpacing: '0.08em',
                    display: 'block',
                    mb: 1,
                }}
            >
                {title} ({count})
            </Typography>

            {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                    <CircularProgress size={28} />
                </Box>
            )}

            {!loading && error && (
                <Alert severity="error" sx={{ borderRadius: 2 }}>
                    {error}
                </Alert>
            )}

            {!loading && !error && count === 0 && (
                <NativeEmptyState
                    icon={<ArticleOutlinedIcon />}
                    title={emptyText ?? t('common.noData', 'No data')}
                />
            )}

            {!loading && !error && count > 0 && (
                <NativeCard>{children}</NativeCard>
            )}
        </Box>
    );
}

// ---------------------------------------------------------------------------
// Connection status header
// ---------------------------------------------------------------------------

const SYNC_INTERVAL_OPTIONS = [
    { value: 300, label: '5 min' },
    { value: 900, label: '15 min' },
    { value: 1800, label: '30 min' },
    { value: 3600, label: '1 hr' },
    { value: 0, label: 'Manual' },
];

interface ConnectionHeaderProps {
    isConnected: boolean;
    serverUrl?: string;
    lastSync?: Date;
    autoSyncEnabled: boolean;
    autoSyncInterval: number;
    onAutoSyncChange: (enabled: boolean) => void;
    onIntervalChange: (interval: number) => void;
    onSyncNow: () => void;
    syncing: boolean;
}

function ConnectionHeader({
    isConnected,
    serverUrl,
    lastSync,
    autoSyncEnabled,
    autoSyncInterval,
    onAutoSyncChange,
    onIntervalChange,
    onSyncNow,
    syncing,
}: ConnectionHeaderProps) {
    const { t } = useTranslation();

    const lastSyncText = lastSync
        ? lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : t('sync.idle');

    return (
        <NativeCard sx={{ mx: `${nativeSpacing.pagePadding}px`, mb: `${nativeSpacing.sectionGap}px` }}>
            <Box sx={{ p: `${nativeSpacing.cardPadding}px` }}>
                {/* Server URL + status dot */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Box
                        sx={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            bgcolor: isConnected ? nativeColors.status.success : nativeColors.status.error,
                            flexShrink: 0,
                        }}
                    />
                    <Typography variant="body2" fontWeight={600} sx={{ flex: 1 }} noWrap>
                        {serverUrl || t('sync.mode')}
                    </Typography>
                    <NativeStatusBadge
                        label={isConnected ? t('sync.connected') : t('sync.disconnected')}
                        color={isConnected ? 'success' : 'error'}
                    />
                </Box>

                {/* Last sync */}
                <Typography variant="caption" color="text.secondary">
                    {t('sync.lastSync')}: {lastSyncText}
                </Typography>

                {/* Auto-sync toggle + interval */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5 }}>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={autoSyncEnabled}
                                onChange={(e) => onAutoSyncChange(e.target.checked)}
                                size="small"
                            />
                        }
                        label={
                            <Typography variant="caption">{t('sync.autoSync')}</Typography>
                        }
                        sx={{ m: 0, flex: 1 }}
                    />

                    {autoSyncEnabled && (
                        <FormControl size="small" sx={{ minWidth: 90 }}>
                            <Select
                                value={autoSyncInterval}
                                onChange={(e) => onIntervalChange(Number(e.target.value))}
                                sx={{ fontSize: '0.75rem', height: 32 }}
                            >
                                {SYNC_INTERVAL_OPTIONS.filter((o) => o.value > 0).map((opt) => (
                                    <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: '0.75rem' }}>
                                        {opt.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}
                </Box>

                {/* Sync Now button */}
                <Box sx={{ mt: 1.5 }}>
                    <ButtonBase
                        onClick={onSyncNow}
                        disabled={syncing}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            px: 2,
                            py: 0.75,
                            borderRadius: 2,
                            bgcolor: nativeColors.primary.main,
                            color: nativeColors.primary.contrastText,
                            minHeight: 36,
                            width: '100%',
                            justifyContent: 'center',
                            opacity: syncing ? 0.6 : 1,
                        }}
                    >
                        {syncing ? (
                            <CircularProgress size={14} sx={{ color: 'inherit' }} />
                        ) : (
                            <SyncIcon sx={{ fontSize: 16 }} />
                        )}
                        <Typography variant="caption" fontWeight={600} sx={{ color: 'inherit', ml: 0.5 }}>
                            {t('sync.syncNow')}
                        </Typography>
                    </ButtonBase>
                </Box>
            </Box>
        </NativeCard>
    );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function NativeAimsPage() {
    const { t } = useTranslation();
    useSetNativeTitle(t('navigation.aimsManagement'));

    const { activeStoreId, isAppReady } = useAuthStore();
    const { syncState, autoSyncEnabled, autoSyncInterval, setAutoSyncEnabled, setAutoSyncInterval } = useSyncStore();

    const { gateways, gatewaysLoading, gatewaysError, fetchGateways } = useGateways(activeStoreId);
    const { labels, labelsLoading, labelsError, stats: labelStats, fetchLabels } = useLabelsOverview(activeStoreId);
    const { articles, articlesLoading, articlesError, fetchArticles } = useArticles(activeStoreId);
    const { templates, templatesLoading, templatesError, fetchTemplates } = useTemplates(activeStoreId);

    const { reset } = useAimsManagementStore();
    const prevStoreRef = useRef(activeStoreId);

    const [activeTab, setActiveTab] = useState<ActiveTab>('gateways');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [syncing, setSyncing] = useState(false);

    // Reset and re-fetch on store change
    useEffect(() => {
        if (prevStoreRef.current !== activeStoreId) {
            reset();
            setExpandedId(null);
            prevStoreRef.current = activeStoreId;
        }
        if (activeStoreId) {
            fetchGateways();
            fetchLabels();
        }
    }, [activeStoreId, reset, fetchGateways, fetchLabels]);

    // Fetch articles/templates lazily when tab is selected
    useEffect(() => {
        if (!activeStoreId) return;
        if (activeTab === 'articles') fetchArticles();
        if (activeTab === 'templates') fetchTemplates();
    }, [activeTab, activeStoreId, fetchArticles, fetchTemplates]);

    const handleRefresh = useCallback(async () => {
        if (!activeStoreId) return;
        await Promise.all([fetchGateways(true), fetchLabels(true)]);
        if (activeTab === 'articles') await fetchArticles({}, true);
        if (activeTab === 'templates') await fetchTemplates({}, true);
    }, [activeStoreId, activeTab, fetchGateways, fetchLabels, fetchArticles, fetchTemplates]);

    const handleSyncNow = useCallback(async () => {
        if (!activeStoreId) return;
        setSyncing(true);
        try {
            await syncApi.push(activeStoreId);
        } catch (err: any) {
            logger.warn('NativeAimsPage', 'Sync now failed', { error: err?.message });
        } finally {
            setSyncing(false);
        }
    }, [activeStoreId]);

    const handleToggleItem = useCallback((id: string) => {
        setExpandedId((prev) => (prev === id ? null : id));
    }, []);

    // Gateway stats for stat bar
    const onlineGateways = useMemo(
        () =>
            gateways.filter((g: any) => {
                const s = (g.status || g.networkStatus || '').toUpperCase();
                return s === 'ONLINE' || s === 'CONNECTED';
            }).length,
        [gateways]
    );

    const chipTabs = useMemo(
        () => [
            { label: t('aims.articles'), value: 'articles' },
            { label: t('aims.gateways'), value: 'gateways' },
            { label: t('aims.labels'), value: 'labels' },
            { label: t('aims.templates'), value: 'templates' },
        ],
        [t]
    );

    const statBarItems = useMemo(
        () => [
            { label: t('aims.gateways'), value: gateways.length },
            {
                label: t('aims.online'),
                value: onlineGateways,
                color: nativeColors.status.success,
            },
            {
                label: t('aims.offline'),
                value: gateways.length - onlineGateways,
                color: nativeColors.status.error,
            },
            { label: t('aims.labels'), value: labelStats.total },
        ],
        [t, gateways.length, onlineGateways, labelStats.total]
    );

    if (!isAppReady || !activeStoreId) {
        return (
            <NativePage>
                <Alert severity="info" sx={{ m: 2, borderRadius: 2 }}>
                    {t('aims.selectStore')}
                </Alert>
            </NativePage>
        );
    }

    // Determine gateway status badge color
    const getGatewayColor = (g: any): 'success' | 'error' => {
        const s = (g.status || g.networkStatus || '').toUpperCase();
        return s === 'ONLINE' || s === 'CONNECTED' ? 'success' : 'error';
    };

    const getLabelColor = (l: any): 'success' | 'warning' | 'error' | 'info' => {
        const s = (l.status || '').toUpperCase();
        if (s === 'ONLINE') return 'success';
        if (s === 'OFFLINE') return 'error';
        if (s === 'ERROR' || s === 'TIMEOUT' || s === 'FAILED') return 'warning';
        return 'info';
    };

    return (
        <NativePage onRefresh={handleRefresh} noPadding>
            {/* Stats bar */}
            <NativeStatBar stats={statBarItems} />

            {/* Connection status header */}
            <ConnectionHeader
                isConnected={syncState.isConnected}
                serverUrl={syncState.lastError ? undefined : t('sync.solumMode')}
                lastSync={syncState.lastSync}
                autoSyncEnabled={autoSyncEnabled}
                autoSyncInterval={autoSyncInterval}
                onAutoSyncChange={setAutoSyncEnabled}
                onIntervalChange={setAutoSyncInterval}
                onSyncNow={handleSyncNow}
                syncing={syncing}
            />

            {/* Section chip bar */}
            <NativeChipBar
                chips={chipTabs}
                activeValue={activeTab}
                onChange={(v) => {
                    setActiveTab(v as ActiveTab);
                    setExpandedId(null);
                }}
            />

            <Box sx={{ pb: 2, mt: 1 }}>
                {/* ---- Gateways ---- */}
                {activeTab === 'gateways' && (
                    <Section
                        title={t('aims.gateways')}
                        count={gateways.length}
                        loading={gatewaysLoading}
                        error={gatewaysError}
                        emptyText={t('aims.noGateways')}
                    >
                        {gateways.map((g: any, idx: number) => {
                            const id = g.mac || g.macAddress || String(idx);
                            return (
                                <Box key={id}>
                                    {idx > 0 && <ItemDivider />}
                                    <ExpandableItem
                                        primaryText={g.apName || g.name || id}
                                        secondaryText={g.ipAddress || g.ip || id}
                                        badge={{
                                            label: g.status || g.networkStatus || t('aims.status'),
                                            color: getGatewayColor(g),
                                        }}
                                        isExpanded={expandedId === id}
                                        onToggle={() => handleToggleItem(id)}
                                        detail={
                                            <>
                                                <DetailRow label={t('aims.macAddress')} value={g.mac || g.macAddress} />
                                                <DetailRow label={t('aims.ipAddress')} value={g.ipAddress || g.ip} />
                                                <DetailRow label={t('aims.firmware')} value={g.firmware || g.firmwareVersion} />
                                                <DetailRow label={t('aims.channel')} value={g.channel} />
                                                <DetailRow label={t('aims.connectedLabels')} value={g.connectedLabels ?? g.labelCount} />
                                                <DetailRow label={t('aims.uptime')} value={g.uptime} />
                                            </>
                                        }
                                    />
                                </Box>
                            );
                        })}
                    </Section>
                )}

                {/* ---- Labels ---- */}
                {activeTab === 'labels' && (
                    <Section
                        title={t('aims.labels')}
                        count={labels.length}
                        loading={labelsLoading}
                        error={labelsError}
                        emptyText={t('aims.totalLabels')}
                    >
                        {labels.map((l: any, idx: number) => {
                            const id = l.labelCode || l.id || String(idx);
                            return (
                                <Box key={id}>
                                    {idx > 0 && <ItemDivider />}
                                    <ExpandableItem
                                        primaryText={l.labelCode || l.id || id}
                                        secondaryText={l.articleId || l.assignedArticle}
                                        badge={{
                                            label: l.status || t('aims.status'),
                                            color: getLabelColor(l),
                                        }}
                                        isExpanded={expandedId === id}
                                        onToggle={() => handleToggleItem(id)}
                                        detail={
                                            <>
                                                <DetailRow label={t('aims.model')} value={l.model || l.labelModel} />
                                                <DetailRow label={t('aims.battery')} value={l.batteryStatus || l.battery} />
                                                <DetailRow label={t('aims.signal')} value={l.signalStrength || l.signal} />
                                                <DetailRow label={t('aims.gateway')} value={l.gatewayMac || l.gateway} />
                                                <DetailRow label={t('aims.articleId')} value={l.articleId} />
                                            </>
                                        }
                                    />
                                </Box>
                            );
                        })}
                    </Section>
                )}

                {/* ---- Articles ---- */}
                {activeTab === 'articles' && (
                    <Section
                        title={t('aims.articles')}
                        count={articles.length}
                        loading={articlesLoading}
                        error={articlesError}
                        emptyText={t('aims.noArticles')}
                    >
                        {articles.map((a: any, idx: number) => {
                            const id = a.articleId || a.id || String(idx);
                            return (
                                <Box key={id}>
                                    {idx > 0 && <ItemDivider />}
                                    <ExpandableItem
                                        primaryText={a.name || a.articleName || id}
                                        secondaryText={id}
                                        isExpanded={expandedId === id}
                                        onToggle={() => handleToggleItem(id)}
                                        detail={
                                            <>
                                                <DetailRow label={t('aims.articleId')} value={a.articleId || a.id} />
                                                <DetailRow label={t('aims.articleName')} value={a.name || a.articleName} />
                                                <DetailRow label={t('aims.linkedLabels')} value={a.linkedLabels ?? a.labelCount} />
                                                <DetailRow label={t('aims.nfcUrl')} value={a.nfcUrl} />
                                            </>
                                        }
                                    />
                                </Box>
                            );
                        })}
                    </Section>
                )}

                {/* ---- Templates ---- */}
                {activeTab === 'templates' && (
                    <Section
                        title={t('aims.templates')}
                        count={templates.length}
                        loading={templatesLoading}
                        error={templatesError}
                        emptyText={t('aims.noTemplates')}
                    >
                        {templates.map((tmpl: any, idx: number) => {
                            const id = tmpl.templateCode || tmpl.id || String(idx);
                            return (
                                <Box key={id}>
                                    {idx > 0 && <ItemDivider />}
                                    <ExpandableItem
                                        primaryText={tmpl.templateName || tmpl.name || id}
                                        secondaryText={tmpl.templateType || tmpl.type}
                                        isExpanded={expandedId === id}
                                        onToggle={() => handleToggleItem(id)}
                                        detail={
                                            <>
                                                <DetailRow label={t('aims.templateName')} value={tmpl.templateName || tmpl.name} />
                                                <DetailRow label={t('aims.templateType')} value={tmpl.templateType || tmpl.type} />
                                                <DetailRow label={t('aims.templateDimensions')} value={tmpl.dimensions} />
                                                <DetailRow label={t('aims.templateColor')} value={tmpl.colorMode || tmpl.color} />
                                                <DetailRow label={t('aims.templateVersion')} value={tmpl.version} />
                                            </>
                                        }
                                    />
                                </Box>
                            );
                        })}
                    </Section>
                )}
            </Box>
        </NativePage>
    );
}
