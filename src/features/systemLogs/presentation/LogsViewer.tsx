import React, { useState, useMemo } from 'react';
import {
    Box,
    Paper,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    IconButton,
    Chip,
    Typography,
    Collapse,
    Stack,
    Button,
    Tooltip,
    Checkbox,
    FormControlLabel,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon,
    Download as DownloadIcon,
    Delete as DeleteIcon,
    Search as SearchIcon,
    Info as InfoIcon,
    Close as CloseIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useLogsStore, type LogLevel, type LogEntry } from '@shared/infrastructure/store/logsStore';
import { useConfirmDialog } from '@shared/presentation/hooks/useConfirmDialog';
import { List as FixedSizeList } from 'react-window';

const LogLevelChip: React.FC<{ level: LogLevel }> = ({ level }) => {
    const colors: Record<LogLevel, 'default' | 'info' | 'warning' | 'error'> = {
        debug: 'default',
        info: 'info',
        warn: 'warning',
        error: 'error',
    };

    return (
        <Chip
            label={level.toUpperCase()}
            color={colors[level]}
            size="small"
            sx={{ p: 1, fontWeight: 600, minWidth: 70 }}
        />
    );
};

// Mobile Log Item - Card-style layout for small screens
const MobileLogItem: React.FC<{
    log: LogEntry;
    style: React.CSSProperties;
    onSelect: (log: LogEntry) => void;
}> = React.memo(({ log, style, onSelect }) => {
    const formatTimestamp = React.useMemo(() => {
        const date = new Date(log.timestamp);
        return date.toLocaleTimeString([], { hour12: false });
    }, [log.timestamp]);

    const hasData = log.data && Object.keys(log.data).length > 0;

    const handleClick = React.useCallback(() => {
        if (hasData) {
            onSelect(log);
        }
    }, [hasData, log, onSelect]);

    return (
        <Box
            style={style}
            sx={{
                borderBottom: '1px solid',
                borderColor: 'divider',
                '&:hover': { bgcolor: 'action.hover' },
                cursor: hasData ? 'pointer' : 'default',
                px: 1,
                py: 0.5,
            }}
            onClick={handleClick}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <LogLevelChip level={log.level} />
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {formatTimestamp}
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                    {log.component}
                </Typography>
                {hasData && <InfoIcon color="primary" sx={{ fontSize: 16, ml: 'auto' }} />}
            </Box>
            <Typography variant="body2" sx={{ 
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
            }}>
                {log.message}
            </Typography>
        </Box>
    );
});

// Desktop Log Item - Table row layout for larger screens
const DesktopLogItem: React.FC<{
    log: LogEntry;
    style: React.CSSProperties;
    onSelect: (log: LogEntry) => void;
}> = React.memo(({ log, style, onSelect }) => {
    const formatTimestamp = React.useMemo(() => {
        const date = new Date(log.timestamp);
        return date.toLocaleTimeString([], { hour12: false });
    }, [log.timestamp]);

    const hasData = log.data && Object.keys(log.data).length > 0;

    const handleClick = React.useCallback(() => {
        if (hasData) {
            onSelect(log);
        }
    }, [hasData, log, onSelect]);

    return (
        <Box
            style={style}
            sx={{
                display: 'flex',
                alignItems: 'center',
                borderBottom: '1px solid',
                borderColor: 'divider',
                '&:hover': { bgcolor: 'action.hover' },
                cursor: hasData ? 'pointer' : 'default',
                px: 1,
            }}
            onClick={handleClick}
        >
            <Box sx={{ width: 40, display: 'flex', justifyContent: 'center' }}>
                {hasData && <InfoIcon color="primary" fontSize="small" />}
            </Box>
            <Typography variant="body2" sx={{ width: 90, flexShrink: 0, color: 'text.secondary' }}>
                {formatTimestamp}
            </Typography>
            <Box sx={{ width: 90, flexShrink: 0, px: 1 }}>
                <LogLevelChip level={log.level} />
            </Box>
            <Typography
                variant="body2"
                noWrap
                sx={{ width: 150, flexShrink: 0, fontWeight: 500, px: 1 }}
            >
                {log.component}
            </Typography>
            <Typography variant="body2" noWrap sx={{ flexGrow: 1, px: 1 }}>
                {log.message}
            </Typography>
        </Box>
    );
});

const DaySection: React.FC<{
    date: string;
    isSelected: boolean;
    onToggleSelect: () => void;
    levelFilter: LogLevel | '';
    searchTerm: string;
    onSelectLog: (log: LogEntry) => void;
    defaultExpanded?: boolean;
    isMobile?: boolean;
}> = React.memo(({ date, isSelected, onToggleSelect, levelFilter, searchTerm, onSelectLog, defaultExpanded = false, isMobile = false }) => {
    const { t } = useTranslation();
    const { loadDayLogs, loadedLogs, getDayLogCount } = useLogsStore();
    const [expanded, setExpanded] = useState(defaultExpanded);
    const [page, setPage] = useState(0);

    // Get pre-loaded count for display (works even when accordion is closed)
    const totalLogCount = getDayLogCount(date);

    // Lazy load logs when expanded
    React.useEffect(() => {
        if (expanded) {
            loadDayLogs(date);
        }
    }, [expanded, date, loadDayLogs]);

    // Get logs from store and apply filters
    const filteredLogs = useMemo(() => {
        const logs = loadedLogs[date] || [];

        return logs.filter(log => {
            if (levelFilter && log.level !== levelFilter) return false;
            if (searchTerm && searchTerm.trim()) {
                const searchLower = searchTerm.toLowerCase();
                return (
                    log.component.toLowerCase().includes(searchLower) ||
                    log.message.toLowerCase().includes(searchLower) ||
                    (log.data && JSON.stringify(log.data).toLowerCase().includes(searchLower))
                );
            }
            return true;
        }).reverse();
    }, [loadedLogs, date, levelFilter, searchTerm]);

    // Use filtered count when logs are loaded and filters are active, otherwise use total count
    const displayCount = (loadedLogs[date] && (levelFilter || searchTerm)) 
        ? filteredLogs.length 
        : totalLogCount;

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString(undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    // Pagination
    const LOGS_PER_PAGE = 100;
    const totalPages = Math.ceil(filteredLogs.length / LOGS_PER_PAGE);
    const paginatedLogs = useMemo(() => {
        const start = page * LOGS_PER_PAGE;
        const end = start + LOGS_PER_PAGE;
        return filteredLogs.slice(start, end);
    }, [filteredLogs, page]);

    // Reset page when filters change
    React.useEffect(() => {
        setPage(0);
    }, [levelFilter, searchTerm, date]);

    // Row height differs for mobile (taller cards) vs desktop (table rows)
    const ROW_HEIGHT = isMobile ? 64 : 42;
    // Calculate list height based on log count, max 400px
    const LIST_HEIGHT = Math.min(paginatedLogs.length * ROW_HEIGHT, 400);

    // Memoize Row component to prevent recreating on every render
    const Row = React.useCallback(({ index, style }: any) => {
        const LogItem = isMobile ? MobileLogItem : DesktopLogItem;
        return (
            <LogItem
                log={paginatedLogs[index]}
                style={style}
                onSelect={onSelectLog}
            />
        );
    }, [paginatedLogs, onSelectLog, isMobile]);

    const VirtualList = FixedSizeList as any;

    return (
        <Accordion expanded={expanded} onChange={() => setExpanded(!expanded)} slotProps={{
            transition: { unmountOnExit: true }
        }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack direction="row" gap={2} alignItems="center" sx={{ width: '100%' }}>
                    <Checkbox
                        checked={isSelected}
                        onChange={(e) => {
                            e.stopPropagation();
                            onToggleSelect();
                        }}
                        onClick={(e) => e.stopPropagation()}
                    />
                    <Typography sx={{ fontWeight: 600, flexGrow: 1 }}>
                        {formatDate(date)}
                    </Typography>
                    <Chip
                        label={`${displayCount} ${t('appLogs.entries')}`}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ p: 1, fontWeight: 600, bgcolor: 'primary.main', color: 'white', }}
                    />
                </Stack>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0, overflow: 'hidden' }}>
                {filteredLogs.length === 0 ? (
                    <Typography color="text.secondary" align="center" sx={{ py: 2 }}>
                        {t('appLogs.noLogs')}
                    </Typography>
                ) : (
                    <Box sx={{ border: '1px solid', borderColor: 'divider' }}>
                        {/* Header for the virtual list - hidden on mobile */}
                        {!isMobile && (
                            <Box sx={{
                                display: 'flex',
                                bgcolor: 'grey.100',
                                borderBottom: '2px solid',
                                borderColor: 'divider',
                                fontWeight: 600,
                                py: 1,
                                px: 1,
                                fontSize: '0.75rem',
                                color: 'text.secondary',
                                textTransform: 'uppercase'
                            }}>
                                <Box sx={{ width: 40 }} />
                                <Box sx={{ width: 90 }}>{t('appLogs.time')}</Box>
                                <Box sx={{ width: 90, px: 1 }}>{t('appLogs.level')}</Box>
                                <Box sx={{ width: 150, px: 1 }}>{t('appLogs.component')}</Box>
                                <Box sx={{ flexGrow: 1, px: 1 }}>{t('appLogs.message')}</Box>
                            </Box>
                        )}

                        <VirtualList
                            key={`${date}-${expanded}-${isMobile}`}
                            height={LIST_HEIGHT}
                            rowCount={paginatedLogs.length}
                            rowHeight={ROW_HEIGHT}
                            rowComponent={Row}
                            rowProps={{}}
                            width="100%"
                        />

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <Box sx={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: 2,
                                p: 1,
                                borderTop: '1px solid',
                                borderColor: 'divider',
                                bgcolor: 'grey.50'
                            }}>
                                <Button
                                    size="small"
                                    onClick={() => setPage(p => Math.max(0, p - 1))}
                                    disabled={page === 0}
                                >
                                    {t('common.previous')}
                                </Button>
                                <Typography variant="body2" color="text.secondary">
                                    {t('common.page')} {page + 1} / {totalPages}
                                </Typography>
                                <Button
                                    size="small"
                                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                    disabled={page === totalPages - 1}
                                >
                                    {t('common.next')}
                                </Button>
                            </Box>
                        )}

                        <Box sx={{ p: 1, textAlign: 'center', bgcolor: 'grey.50', borderTop: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="caption" color="text.secondary">
                                {t('appLogs.totalEntries', { count: filteredLogs.length })}
                                {totalPages > 1 && ` (${t('common.showing')} ${page * LOGS_PER_PAGE + 1}-${Math.min((page + 1) * LOGS_PER_PAGE, filteredLogs.length)})`}
                            </Typography>
                        </Box>
                    </Box>
                )}
            </AccordionDetails>
        </Accordion>
    );
});

export const LogsViewer: React.FC = () => {
    const { t } = useTranslation();
    const { availableDays, clearLogs, exportMultipleDays, init } = useLogsStore();
    const { confirm, ConfirmDialog } = useConfirmDialog();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [levelFilter, setLevelFilter] = useState<LogLevel | ''>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());
    const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

    // Init store on mount
    React.useEffect(() => {
        init();
    }, [init]);

    const allDays = availableDays;

    const handleToggleDay = React.useCallback((date: string) => {
        setSelectedDays(prev => {
            const newSet = new Set(prev);
            if (newSet.has(date)) {
                newSet.delete(date);
            } else {
                newSet.add(date);
            }
            return newSet;
        });
    }, []);

    const handleSelectAll = React.useCallback(() => {
        if (selectedDays.size === allDays.length) {
            setSelectedDays(new Set());
        } else {
            setSelectedDays(new Set(allDays));
        }
    }, [selectedDays.size, allDays]);

    const handleExportSelected = async () => {
        if (selectedDays.size === 0) return;
        const daysArray = Array.from(selectedDays).sort();
        const blob = await exportMultipleDays(daysArray);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `logs-${daysArray[0]}-to-${daysArray[daysArray.length - 1]}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleClearSelected = async () => {
        if (selectedDays.size === 0) return;
        const confirmed = await confirm({
            title: t('appLogs.clearSelected'),
            message: t('appLogs.confirmClearSelected', { count: selectedDays.size }),
            confirmLabel: t('appLogs.clear'),
            severity: 'warning'
        });
        if (confirmed) {
            selectedDays.forEach(date => clearLogs(date));
            setSelectedDays(new Set());
        }
    };

    const handleClearAll = async () => {
        const confirmed = await confirm({
            title: t('appLogs.clearAll'),
            message: t('appLogs.confirmClear'),
            confirmLabel: t('appLogs.clear'),
            severity: 'error'
        });
        if (confirmed) {
            clearLogs();
            setSelectedDays(new Set());
        }
    };

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Toolbar */}
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                gap={2}
                sx={{ mb: 2 }}
                alignItems={{ xs: 'stretch', sm: 'center' }}
            >
                <TextField
                    size="small"
                    placeholder={t('appLogs.searchPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    sx={{ minWidth: { xs: '100%', sm: 250 } }}
                    fullWidth={isMobile}
                    slotProps={{
                        input: {
                            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                        }
                    }}
                />

                <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 150 } }} fullWidth={isMobile}>
                    <InputLabel>{t('appLogs.levelFilter')}</InputLabel>
                    <Select
                        value={levelFilter}
                        label={t('appLogs.levelFilter')}
                        onChange={(e) => setLevelFilter(e.target.value as LogLevel | '')}
                    >
                        <MenuItem value="">{t('appLogs.allLevels')}</MenuItem>
                        <MenuItem value="debug">DEBUG</MenuItem>
                        <MenuItem value="info">INFO</MenuItem>
                        <MenuItem value="warn">WARN</MenuItem>
                        <MenuItem value="error">ERROR</MenuItem>
                    </Select>
                </FormControl>

                {!isMobile && <Box sx={{ flexGrow: 1 }} />}

                <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap" justifyContent={{ xs: 'space-between', sm: 'flex-end' }}>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={selectedDays.size === allDays.length && allDays.length > 0}
                                indeterminate={selectedDays.size > 0 && selectedDays.size < allDays.length}
                                onChange={handleSelectAll}
                            />
                        }
                        label={allDays.length > 0 ? t('appLogs.selectAll') : ''}
                    />

                    <Tooltip title={t('appLogs.exportSelectedZip')}>
                        <span>
                            <Button
                                variant="text"
                                size="small"
                                startIcon={<DownloadIcon />}
                                onClick={handleExportSelected}
                                disabled={selectedDays.size === 0}
                            >
                                {isMobile ? `(${selectedDays.size})` : `${t('appLogs.exportZip')} (${selectedDays.size})`}
                            </Button>
                        </span>
                    </Tooltip>

                    <Tooltip title={t('appLogs.clearSelected')}>
                        <span>
                            <Button
                                variant="text"
                                size="small"
                                color="warning"
                                startIcon={<DeleteIcon />}
                                onClick={handleClearSelected}
                                disabled={selectedDays.size === 0}
                            >
                                {isMobile ? `(${selectedDays.size})` : `${t('appLogs.clearSelected')} (${selectedDays.size})`}
                            </Button>
                        </span>
                    </Tooltip>

                    <Tooltip title={t('appLogs.clearAll')}>
                        <Button
                            variant="text"
                            size="small"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={handleClearAll}
                        >
                            {!isMobile && t('appLogs.clearAll')}
                        </Button>
                    </Tooltip>
                </Stack>
            </Stack>
            {/* Days list */}
            <Box sx={{ flexGrow: 1, overflow: 'auto', pr: 1 }}>
                {allDays.length === 0 ? (
                    <Paper sx={{ p: 4, textAlign: 'center' }}>
                        <Typography color="text.secondary">
                            {t('appLogs.noLogs')}
                        </Typography>
                    </Paper>
                ) : (
                    allDays.map((date, index) => (
                        <DaySection
                            key={date}
                            date={date}
                            isSelected={selectedDays.has(date)}
                            onToggleSelect={() => handleToggleDay(date)}
                            levelFilter={levelFilter}
                            searchTerm={searchTerm}
                            onSelectLog={setSelectedLog}
                            defaultExpanded={index === 0}
                            isMobile={isMobile}
                        />
                    ))
                )}
            </Box>
            {/* Log Details Sidebar */}
            <Collapse in={!!selectedLog} unmountOnExit orientation="horizontal" sx={{ position: 'fixed', right: 0, top: 0, height: '100%', zIndex: 1301 }}>
                {selectedLog && (
                    <Paper
                        elevation={8}
                        sx={{
                            width: { xs: '100vw', sm: 500 },
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            borderLeft: '1px solid',
                            borderColor: 'divider',
                        }}
                    >
                        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'primary.main', color: 'primary.contrastText' }}>
                            <Typography variant="h6" sx={{ flexGrow: 1 }}>
                                {t('appLogs.details')}
                            </Typography>
                            <IconButton onClick={() => setSelectedLog(null)} color="inherit">
                                <CloseIcon />
                            </IconButton>
                        </Box>
                        <Box sx={{ p: 3, flexGrow: 1, overflow: 'auto' }}>
                            <Stack gap={2}>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">{t('appLogs.time')}</Typography>
                                    <Typography variant="body1">{new Date(selectedLog.timestamp).toLocaleString()}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">{t('appLogs.component')}</Typography>
                                    <Typography variant="body1" sx={{ fontWeight: 600 }}>{selectedLog.component}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">{t('appLogs.message')}</Typography>
                                    <Typography variant="body1">{selectedLog.message}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">{t('appLogs.data')}</Typography>
                                    <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50', mt: 1 }}>
                                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '0.8125rem', fontFamily: 'monospace' }}>
                                            {JSON.stringify(selectedLog.data, null, 2)}
                                        </pre>
                                    </Paper>
                                </Box>
                            </Stack>
                        </Box>
                    </Paper>
                )}
            </Collapse>
            <ConfirmDialog />
        </Box>
    );
};
