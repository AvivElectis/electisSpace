import React, { useState, useMemo } from 'react';
import {
    Box,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
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
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    Download as DownloadIcon,
    Delete as DeleteIcon,
    Search as SearchIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useLogsStore, type LogLevel, type LogEntry } from '@shared/infrastructure/store/logsStore';
import { useConfirmDialog } from '@shared/presentation/hooks/useConfirmDialog';

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
            sx={{ fontWeight: 600, minWidth: 70 }}
        />
    );
};

const LogRow: React.FC<{ log: LogEntry }> = ({ log }) => {
    const [expanded, setExpanded] = useState(false);
    const { t } = useTranslation();

    const formatTimestamp = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString();
    };

    const hasData = log.data && Object.keys(log.data).length > 0;

    return (
        <>
            <TableRow hover sx={{ '& > *': { borderBottom: 'unset' } }}>
                <TableCell sx={{ width: 40 }}>
                    {hasData && (
                        <IconButton
                            size="small"
                            onClick={() => setExpanded(!expanded)}
                            aria-label={expanded ? t('appLogs.collapse') : t('appLogs.expand')}
                        >
                            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                    )}
                </TableCell>
                <TableCell sx={{ width: 100 }}>{formatTimestamp(log.timestamp)}</TableCell>
                <TableCell sx={{ width: 100 }}>
                    <LogLevelChip level={log.level} />
                </TableCell>
                <TableCell sx={{ width: 150, fontWeight: 500 }}>{log.component}</TableCell>
                <TableCell>{log.message}</TableCell>
            </TableRow>
            {hasData && (
                <TableRow>
                    <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={5}>
                        <Collapse in={expanded} timeout="auto" unmountOnExit>
                            <Box sx={{ margin: 2 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                    {t('appLogs.details')}:
                                </Typography>
                                <Paper
                                    variant="outlined"
                                    sx={{
                                        p: 2,
                                        bgcolor: 'grey.50',
                                        maxHeight: 300,
                                        overflow: 'auto',
                                    }}
                                >
                                    <pre style={{ margin: 0, fontSize: '0.875rem' }}>
                                        {JSON.stringify(log.data, null, 2)}
                                    </pre>
                                </Paper>
                            </Box>
                        </Collapse>
                    </TableCell>
                </TableRow>
            )}
        </>
    );
};

const DaySection: React.FC<{
    date: string;
    isSelected: boolean;
    onToggleSelect: () => void;
    levelFilter: LogLevel | '';
    searchTerm: string;
}> = ({ date, isSelected, onToggleSelect, levelFilter, searchTerm }) => {
    const { t } = useTranslation();
    const { getFilteredLogs } = useLogsStore();
    const [expanded, setExpanded] = useState(false);

    const filteredLogs = useMemo(() => {
        return getFilteredLogs(date, levelFilter || undefined, searchTerm || undefined).reverse();
    }, [date, levelFilter, searchTerm, getFilteredLogs]);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString(undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <Accordion expanded={expanded} onChange={() => setExpanded(!expanded)}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%' }}>
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
                        label={`${filteredLogs.length} ${t('appLogs.entries')}`}
                        size="small"
                        color="primary"
                        variant="outlined"
                    />
                </Stack>
            </AccordionSummary>
            <AccordionDetails>
                {filteredLogs.length === 0 ? (
                    <Typography color="text.secondary" align="center" sx={{ py: 2 }}>
                        {t('appLogs.noLogs')}
                    </Typography>
                ) : (
                    <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ width: 40 }} />
                                    <TableCell sx={{ width: 100, fontWeight: 600 }}>
                                        {t('appLogs.time')}
                                    </TableCell>
                                    <TableCell sx={{ width: 100, fontWeight: 600 }}>
                                        {t('appLogs.level')}
                                    </TableCell>
                                    <TableCell sx={{ width: 150, fontWeight: 600 }}>
                                        {t('appLogs.component')}
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>{t('appLogs.message')}</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredLogs.map((log) => <LogRow key={log.id} log={log} />)}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </AccordionDetails>
        </Accordion>
    );
};

export const LogsViewer: React.FC = () => {
    const { t } = useTranslation();
    const { getAllDays, clearLogs, exportMultipleDays } = useLogsStore();
    const { confirm, ConfirmDialog } = useConfirmDialog();

    const [levelFilter, setLevelFilter] = useState<LogLevel | ''>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());

    const allDays = getAllDays();

    const handleToggleDay = (date: string) => {
        setSelectedDays(prev => {
            const newSet = new Set(prev);
            if (newSet.has(date)) {
                newSet.delete(date);
            } else {
                newSet.add(date);
            }
            return newSet;
        });
    };

    const handleSelectAll = () => {
        if (selectedDays.size === allDays.length) {
            setSelectedDays(new Set());
        } else {
            setSelectedDays(new Set(allDays));
        }
    };

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
                direction="row"
                spacing={2}
                sx={{ mb: 2, flexWrap: 'wrap', gap: 2 }}
                alignItems="center"
            >
                <TextField
                    size="small"
                    placeholder={t('appLogs.searchPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                        startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                    }}
                    sx={{ minWidth: 250 }}
                />

                <FormControl size="small" sx={{ minWidth: 150 }}>
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

                <Box sx={{ flexGrow: 1 }} />

                <FormControlLabel
                    control={
                        <Checkbox
                            checked={selectedDays.size === allDays.length && allDays.length > 0}
                            indeterminate={selectedDays.size > 0 && selectedDays.size < allDays.length}
                            onChange={handleSelectAll}
                        />
                    }
                    label={t('appLogs.selectAll')}
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
                            {t('appLogs.exportZip')} ({selectedDays.size})
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
                            {t('appLogs.clearSelected')} ({selectedDays.size})
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
                        {t('appLogs.clearAll')}
                    </Button>
                </Tooltip>
            </Stack>

            {/* Days count */}
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {t('appLogs.totalDays', { count: allDays.length })}
            </Typography>

            {/* Days list */}
            <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                {allDays.length === 0 ? (
                    <Paper sx={{ p: 4, textAlign: 'center' }}>
                        <Typography color="text.secondary">
                            {t('appLogs.noLogs')}
                        </Typography>
                    </Paper>
                ) : (
                    allDays.map((date) => (
                        <DaySection
                            key={date}
                            date={date}
                            isSelected={selectedDays.has(date)}
                            onToggleSelect={() => handleToggleDay(date)}
                            levelFilter={levelFilter}
                            searchTerm={searchTerm}
                        />
                    ))
                )}
            </Box>
            <ConfirmDialog />
        </Box>
    );
};
