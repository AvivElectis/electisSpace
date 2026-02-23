import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  TextField,
  MenuItem,
  IconButton,
  Tooltip,
  Collapse,
  CircularProgress,
  Alert,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useTranslation } from 'react-i18next';
import { auditLogApi, type AuditLogEntry, type AuditLogFilters } from '../infrastructure/auditLogApi';

const ACTION_COLORS: Record<string, 'success' | 'info' | 'warning' | 'error' | 'default'> = {
  CREATE: 'success',
  UPDATE: 'info',
  DELETE: 'error',
  LOGIN: 'default',
  LOGOUT: 'default',
  SYNC: 'warning',
};

function ActionChip({ action }: { action: string }) {
  const color = ACTION_COLORS[action.toUpperCase()] || 'default';
  return <Chip label={action} size="small" color={color} variant="outlined" sx={{ fontWeight: 600, fontSize: '0.7rem' }} />;
}

function DataDiff({ oldData, newData }: { oldData: Record<string, unknown> | null; newData: Record<string, unknown> | null }) {
  if (!oldData && !newData) return <Typography variant="caption" color="text.secondary">—</Typography>;
  return (
    <Box sx={{ fontFamily: 'monospace', fontSize: '0.75rem', maxHeight: 200, overflow: 'auto' }}>
      {oldData && (
        <Box sx={{ mb: 1 }}>
          <Typography variant="caption" fontWeight={600} color="error.main">Old:</Typography>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(oldData, null, 2)}</pre>
        </Box>
      )}
      {newData && (
        <Box>
          <Typography variant="caption" fontWeight={600} color="success.main">New:</Typography>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(newData, null, 2)}</pre>
        </Box>
      )}
    </Box>
  );
}

/**
 * Audit Log Page — Admin-only view of system activity
 */
export function AuditLogPage() {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const [filters, setFilters] = useState<AuditLogFilters>({
    page: 1,
    limit: 25,
  });

  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: AuditLogFilters = { ...filters };
      if (actionFilter) params.action = actionFilter;
      if (entityFilter) params.entityType = entityFilter;
      const res = await auditLogApi.list(params);
      setEntries(res.data);
      setTotal(res.pagination.total);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to load audit log');
    } finally {
      setLoading(false);
    }
  }, [filters, actionFilter, entityFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePageChange = (_: unknown, newPage: number) => {
    setFilters(f => ({ ...f, page: newPage + 1 }));
  };

  const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(f => ({ ...f, limit: parseInt(e.target.value, 10), page: 1 }));
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString();
  };

  const getUserDisplay = (entry: AuditLogEntry) => {
    if (entry.user) {
      const name = [entry.user.firstName, entry.user.lastName].filter(Boolean).join(' ');
      return name || entry.user.email;
    }
    return entry.userId || 'System';
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1400, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>
          {t('auditLog.title', 'Audit Log')}
        </Typography>
        <Tooltip title={t('common.refresh', 'Refresh')}>
          <IconButton onClick={fetchData} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField
          select
          label={t('auditLog.actionFilter', 'Action')}
          value={actionFilter}
          onChange={e => { setActionFilter(e.target.value); setFilters(f => ({ ...f, page: 1 })); }}
          size="small"
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="">All</MenuItem>
          {['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'SYNC'].map(a => (
            <MenuItem key={a} value={a}>{a}</MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label={t('auditLog.entityFilter', 'Entity Type')}
          value={entityFilter}
          onChange={e => { setEntityFilter(e.target.value); setFilters(f => ({ ...f, page: 1 })); }}
          size="small"
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All</MenuItem>
          {['User', 'Space', 'Person', 'Store', 'Company', 'Label', 'ConferenceRoom', 'Settings'].map(e => (
            <MenuItem key={e} value={e}>{e}</MenuItem>
          ))}
        </TextField>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell width={40} />
              <TableCell>{t('auditLog.time', 'Time')}</TableCell>
              <TableCell>{t('auditLog.user', 'User')}</TableCell>
              <TableCell>{t('auditLog.action', 'Action')}</TableCell>
              <TableCell>{t('auditLog.entityType', 'Entity')}</TableCell>
              <TableCell>{t('auditLog.entityId', 'Entity ID')}</TableCell>
              <TableCell>{t('auditLog.store', 'Store')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && entries.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            )}
            {!loading && entries.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">{t('auditLog.empty', 'No audit log entries found')}</Typography>
                </TableCell>
              </TableRow>
            )}
            {entries.map(entry => (
              <Box component="tbody" key={entry.id}>
                <TableRow
                  hover
                  sx={{ cursor: 'pointer', '& > *': { borderBottom: expandedRow === entry.id ? 0 : undefined } }}
                  onClick={() => setExpandedRow(expandedRow === entry.id ? null : entry.id)}
                >
                  <TableCell>
                    <IconButton size="small">
                      {expandedRow === entry.id ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                    </IconButton>
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>{formatDate(entry.createdAt)}</TableCell>
                  <TableCell sx={{ fontSize: '0.8rem' }}>{getUserDisplay(entry)}</TableCell>
                  <TableCell><ActionChip action={entry.action} /></TableCell>
                  <TableCell sx={{ fontSize: '0.8rem' }}>{entry.entityType}</TableCell>
                  <TableCell sx={{ fontSize: '0.75rem', fontFamily: 'monospace', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {entry.entityId || '—'}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.8rem' }}>{entry.store?.name || '—'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={7} sx={{ py: 0, px: 2 }}>
                    <Collapse in={expandedRow === entry.id} timeout="auto" unmountOnExit>
                      <Box sx={{ py: 2 }}>
                        <DataDiff oldData={entry.oldData} newData={entry.newData} />
                        {entry.ipAddress && (
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                            IP: {entry.ipAddress}
                          </Typography>
                        )}
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </Box>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={total}
        page={(filters.page || 1) - 1}
        onPageChange={handlePageChange}
        rowsPerPage={filters.limit || 25}
        onRowsPerPageChange={handleRowsPerPageChange}
        rowsPerPageOptions={[10, 25, 50, 100]}
      />
    </Box>
  );
}
