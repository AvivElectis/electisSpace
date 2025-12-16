import {
    Box,
    Typography,
    List,
    ListItem,
    ListItemText,
    Chip,
    Button,
    Stack,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Paper,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useState } from 'react';
import { logger, type LogLevel } from '@shared/infrastructure/services/logger';

/**
 * Logs Viewer Tab
 * Display and filter application logs
 */
export function LogsViewerTab() {
    const [levelFilter, setLevelFilter] = useState<LogLevel | 'all'>('all');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [logs, setLogs] = useState(logger.getLogs());

    const handleRefresh = () => {
        setLogs(logger.getLogs());
    };

    const handleClear = () => {
        if (window.confirm('Are you sure you want to clear all logs?')) {
            logger.clearLogs();
            setLogs([]);
        }
    };

    // Filter logs
    const filteredLogs = logs.filter((log) => {
        if (levelFilter !== 'all' && log.level !== levelFilter) return false;
        if (categoryFilter !== 'all' && log.category !== categoryFilter) return false;
        return true;
    });

    // Get unique categories
    const categories = Array.from(new Set(logs.map(log => log.category))).sort();

    // Get level color
    const getLevelColor = (level: LogLevel): 'default' | 'info' | 'warning' | 'error' => {
        switch (level) {
            case 'debug': return 'default';
            case 'info': return 'info';
            case 'warn': return 'warning';
            case 'error': return 'error';
            default: return 'default';
        }
    };

    return (
        <Box sx={{ px: 3 }}>
            <Stack spacing={3}>
                {/* Controls */}
                <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                    <FormControl sx={{ minWidth: 150 }}>
                        <InputLabel>Level</InputLabel>
                        <Select
                            value={levelFilter}
                            label="Level"
                            onChange={(e) => setLevelFilter(e.target.value as any)}
                            size="small"
                        >
                            <MenuItem value="all">All Levels</MenuItem>
                            <MenuItem value="debug">Debug</MenuItem>
                            <MenuItem value="info">Info</MenuItem>
                            <MenuItem value="warn">Warn</MenuItem>
                            <MenuItem value="error">Error</MenuItem>
                        </Select>
                    </FormControl>

                    <FormControl sx={{ minWidth: 200 }}>
                        <InputLabel>Category</InputLabel>
                        <Select
                            value={categoryFilter}
                            label="Category"
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            size="small"
                        >
                            <MenuItem value="all">All Categories</MenuItem>
                            {categories.map(cat => (
                                <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <Box sx={{ flexGrow: 1 }} />

                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={handleRefresh}
                        size="small"
                    >
                        Refresh
                    </Button>

                    <Button
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={handleClear}
                        size="small"
                    >
                        Clear Logs
                    </Button>
                </Stack>

                {/* Logs Display */}
                <Paper variant="outlined" sx={{ maxHeight: 400, overflow: 'auto' }}>
                    {filteredLogs.length === 0 ? (
                        <Box sx={{ p: 3, textAlign: 'center' }}>
                            <Typography color="text.secondary">
                                No logs to display
                            </Typography>
                        </Box>
                    ) : (
                        <List dense>
                            {filteredLogs.map((log, index) => (
                                <ListItem key={index} divider>
                                    <ListItemText
                                        primary={
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <Chip
                                                    label={log.level.toUpperCase()}
                                                    color={getLevelColor(log.level)}
                                                    size="small"
                                                    sx={{ minWidth: 60 }}
                                                />
                                                <Typography variant="caption" color="text.secondary">
                                                    {new Date(log.timestamp).toLocaleString()}
                                                </Typography>
                                                <Chip
                                                    label={log.category}
                                                    size="small"
                                                    variant="outlined"
                                                />
                                                <Typography variant="body2">
                                                    {log.message}
                                                </Typography>
                                            </Stack>
                                        }
                                        secondary={
                                            log.data && (
                                                <Typography
                                                    variant="caption"
                                                    component="pre"
                                                    sx={{
                                                        mt: 1,
                                                        p: 1,
                                                        bgcolor: 'background.default',
                                                        borderRadius: 1,
                                                        overflow: 'auto',
                                                    }}
                                                >
                                                    {JSON.stringify(log.data, null, 2)}
                                                </Typography>
                                            )
                                        }
                                    />
                                </ListItem>
                            ))}
                        </List>
                    )}
                </Paper>

                <Typography variant="caption" color="text.secondary">
                    Showing {filteredLogs.length} of {logs.length} log entries
                </Typography>
            </Stack>
        </Box>
    );
}
