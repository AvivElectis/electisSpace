/**
 * Templates Tab Component
 *
 * Displays a searchable, paginated template table with sort and detail dialog.
 * Follows the same pattern as ArticlesTab for table + search.
 */

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Box, TextField, Table, TableBody, TableCell, TableContainer, TableHead,
    TableRow, Paper, Typography, TablePagination, Chip, CircularProgress,
    Alert, InputAdornment, Stack, TableSortLabel, useMediaQuery, useTheme,
    Button, Snackbar,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import { useAuthContext } from '@features/auth/application/useAuthContext';
import { useTemplates } from '../application/useTemplates';
import { TemplateDetailDialog } from './TemplateDetailDialog';
import { UploadTemplateDialog } from './UploadTemplateDialog';

interface TemplatesTabProps {
    storeId: string;
    externalUploadOpen?: boolean;
    onExternalUploadClose?: () => void;
}

type SortField = 'templateName' | 'labelType' | 'dimensions' | 'dithering';
type SortDir = 'asc' | 'desc';


export function TemplatesTab({ storeId, externalUploadOpen, onExternalUploadClose }: TemplatesTabProps) {
    const { t } = useTranslation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const { hasStoreRole, isAppViewer } = useAuthContext();
    const canManage = hasStoreRole('STORE_ADMIN') && !isAppViewer;
    const {
        templates, templatesLoading, templatesError, templatesTotalElements,
        templateTypes, templateMappings, templateGroups,
        fetchTemplates, fetchTemplateDetail, fetchTemplateTypes, fetchTemplateMappings, fetchTemplateGroups,
        selectedTemplate, setSelectedTemplate, downloadTemplate, uploadTemplate,
    } = useTemplates(storeId);

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(50);
    const [searchTerm, setSearchTerm] = useState('');
    const [detailOpen, setDetailOpen] = useState(false);
    const [internalUploadOpen, setInternalUploadOpen] = useState(false);
    const uploadOpen = internalUploadOpen || !!externalUploadOpen;
    const closeUpload = () => { setInternalUploadOpen(false); onExternalUploadClose?.(); };
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
    const [sortField, setSortField] = useState<SortField>('templateName');
    const [sortDir, setSortDir] = useState<SortDir>('asc');

    useEffect(() => {
        fetchTemplates({ page, size: rowsPerPage });
    }, [fetchTemplates, page, rowsPerPage]);

    // Load types, mappings, groups once
    useEffect(() => {
        fetchTemplateTypes();
        fetchTemplateMappings();
        fetchTemplateGroups();
    }, [fetchTemplateTypes, fetchTemplateMappings, fetchTemplateGroups]);

    // Filter and sort templates
    const filtered = useMemo(() => {
        let result = templates;

        // Search filter
        if (searchTerm.trim()) {
            const term = searchTerm.trim().toLowerCase();
            result = result.filter((tmpl: any) =>
                (tmpl.templateName || tmpl.name || '').toLowerCase().includes(term) ||
                (tmpl.labelType || tmpl.type || '').toLowerCase().includes(term)
            );
        }

        // Sort
        result = [...result].sort((a: any, b: any) => {
            let aVal = '';
            let bVal = '';
            switch (sortField) {
                case 'templateName':
                    aVal = a.templateName || a.name || '';
                    bVal = b.templateName || b.name || '';
                    break;
                case 'labelType':
                    aVal = a.labelType || a.type || '';
                    bVal = b.labelType || b.type || '';
                    break;
                case 'dimensions': {
                    const aW = a.width ?? 0;
                    const bW = b.width ?? 0;
                    return sortDir === 'asc' ? aW - bW : bW - aW;
                }
                case 'dithering': {
                    const aD = (a.dithering ?? a.ditheringYn ?? false) ? 1 : 0;
                    const bD = (b.dithering ?? b.ditheringYn ?? false) ? 1 : 0;
                    return sortDir === 'asc' ? aD - bD : bD - aD;
                }
            }
            const cmp = aVal.localeCompare(bVal, undefined, { sensitivity: 'base' });
            return sortDir === 'asc' ? cmp : -cmp;
        });

        return result;
    }, [templates, searchTerm, sortField, sortDir]);

    const existingTemplateNames = useMemo(
        () => templates.map((t: any) => t.templateName || t.name || '').filter(Boolean),
        [templates],
    );

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('asc');
        }
    };

    const handleRowClick = (tmpl: any) => {
        // Set immediately from list data so the dialog opens instantly
        setSelectedTemplate(tmpl);
        setDetailOpen(true);
        // Fetch full detail in background to enrich the data
        const name = tmpl.templateName || tmpl.name;
        if (name) {
            fetchTemplateDetail(name);
        }
    };

    const handleDetailClose = () => {
        setDetailOpen(false);
    };

    const handleUpload = useCallback(async (templateData: Record<string, any>) => {
        try {
            await uploadTemplate(templateData);
            setSnackbar({ open: true, message: t('aims.uploadTemplateSuccess'), severity: 'success' });
        } catch {
            setSnackbar({ open: true, message: t('aims.uploadTemplateFailed'), severity: 'error' });
            throw new Error('upload failed');
        }
    }, [uploadTemplate, t]);

    if (templatesLoading && templates.length === 0) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    }

    return (
        <Box>
            {templatesError && <Alert severity="error" sx={{ mb: 2 }}>{templatesError}</Alert>}

            {/* Search + Upload */}
            <Stack direction="row" gap={2} alignItems="center" sx={{ mb: 2 }} flexWrap="wrap">
                <TextField
                    size="small"
                    placeholder={t('aims.searchByTemplate')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon fontSize="small" />
                                </InputAdornment>
                            ),
                        },
                    }}
                    sx={{ width: { xs: '100%', sm: 400 } }}
                />
                {searchTerm && (
                    <Typography variant="caption" color="text.secondary" dir="ltr">
                        {filtered.length} / {templates.length}
                    </Typography>
                )}
                {canManage && !isMobile && (
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => setInternalUploadOpen(true)}
                        sx={{ ml: 'auto' }}
                    >
                        {t('aims.uploadTemplate')}
                    </Button>
                )}
            </Stack>

            {/* Template list */}
            {templates.length > 0 ? (
                isMobile ? (
                    // Mobile: card-style list
                    <Stack gap={1}>
                        {filtered.slice(0, 100).map((tmpl: any, i: number) => {
                            const name = tmpl.templateName || tmpl.name || '';
                            const labelType = tmpl.labelType || tmpl.type || '';
                            const width = tmpl.width ?? '';
                            const height = tmpl.height ?? '';
                            const dithering = tmpl.dithering ?? tmpl.ditheringYn ?? false;
                            return (
                                <Paper
                                    key={name || i}
                                    variant="outlined"
                                    sx={{
                                        p: 1.5,
                                        cursor: 'pointer',
                                        '&:hover': { bgcolor: 'action.hover' },
                                    }}
                                    onClick={() => handleRowClick(tmpl)}
                                >
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                        <Typography variant="body2" fontFamily="monospace" fontWeight={600}>
                                            {name}
                                        </Typography>
                                        {dithering && (
                                            <Chip
                                                label={t('aims.templateDithering')}
                                                size="small"
                                                color="success"
                                                variant="outlined"
                                            />
                                        )}
                                    </Box>
                                    <Stack direction="row" gap={1} flexWrap="wrap">
                                        {labelType && <Chip label={labelType} size="small" variant="outlined" />}
                                        {(width || height) && (
                                            <Typography variant="caption" color="text.secondary" dir="ltr" component="span">
                                                {width} x {height}
                                            </Typography>
                                        )}
                                    </Stack>
                                </Paper>
                            );
                        })}
                        {filtered.length > 100 && (
                            <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', py: 1 }}>
                                {t('aims.searchByTemplate')} ({filtered.length - 100} more)
                            </Typography>
                        )}
                    </Stack>
                ) : (
                    // Desktop: table
                    <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 500 }}>
                        <Table size="small" stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell>
                                        <TableSortLabel
                                            active={sortField === 'templateName'}
                                            direction={sortField === 'templateName' ? sortDir : 'asc'}
                                            onClick={() => handleSort('templateName')}
                                        >
                                            {t('aims.templateName')}
                                        </TableSortLabel>
                                    </TableCell>
                                    <TableCell>
                                        <TableSortLabel
                                            active={sortField === 'labelType'}
                                            direction={sortField === 'labelType' ? sortDir : 'asc'}
                                            onClick={() => handleSort('labelType')}
                                        >
                                            {t('aims.templateType')}
                                        </TableSortLabel>
                                    </TableCell>
                                    <TableCell>
                                        <TableSortLabel
                                            active={sortField === 'dimensions'}
                                            direction={sortField === 'dimensions' ? sortDir : 'asc'}
                                            onClick={() => handleSort('dimensions')}
                                        >
                                            {t('aims.templateDimensions')}
                                        </TableSortLabel>
                                    </TableCell>
                                    <TableCell align="center">
                                        <TableSortLabel
                                            active={sortField === 'dithering'}
                                            direction={sortField === 'dithering' ? sortDir : 'asc'}
                                            onClick={() => handleSort('dithering')}
                                        >
                                            {t('aims.templateDithering')}
                                        </TableSortLabel>
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filtered.slice(0, 200).map((tmpl: any, i: number) => {
                                    const name = tmpl.templateName || tmpl.name || '';
                                    const labelType = tmpl.labelType || tmpl.type || '';
                                    const width = tmpl.width ?? '';
                                    const height = tmpl.height ?? '';
                                    const dithering = tmpl.dithering ?? tmpl.ditheringYn ?? false;
                                    return (
                                        <TableRow
                                            key={name || i}
                                            hover
                                            sx={{ cursor: 'pointer' }}
                                            onClick={() => handleRowClick(tmpl)}
                                        >
                                            <TableCell>
                                                <Typography variant="body2" fontFamily="monospace">
                                                    {name}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>{labelType || '\u2014'}</TableCell>
                                            <TableCell>
                                                {(width || height) ? <span dir="ltr">{width} x {height}</span> : '\u2014'}
                                            </TableCell>
                                            <TableCell align="center">
                                                <Chip
                                                    label={dithering ? t('common.yes') : t('common.no')}
                                                    size="small"
                                                    variant="outlined"
                                                    color={dithering ? 'success' : 'default'}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {filtered.length === 0 && !templatesLoading && (
                                    <TableRow>
                                        <TableCell colSpan={4} align="center">
                                            <Typography color="text.secondary" sx={{ py: 2 }}>
                                                {t('aims.noTemplates')}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )
            ) : (
                !templatesLoading && (
                    <Alert severity="info">{t('aims.noTemplates')}</Alert>
                )
            )}

            {filtered.length > 200 && !isMobile && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    {t('aims.searchByTemplate')} ({filtered.length - 200} more)
                </Typography>
            )}

            {/* Pagination */}
            {templates.length > 0 && (
                <TablePagination
                    component="div"
                    count={templatesTotalElements || templates.length}
                    page={page}
                    onPageChange={(_, p) => setPage(p)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                    rowsPerPageOptions={[25, 50, 100]}
                />
            )}

            {/* Template detail dialog */}
            <TemplateDetailDialog
                open={detailOpen}
                onClose={handleDetailClose}
                template={selectedTemplate}
                templateMappings={templateMappings}
                templateGroups={templateGroups}
                onDownload={downloadTemplate}
                canManage={canManage}
                onUpdateFiles={canManage ? handleUpload : undefined}
            />

            {/* Upload template dialog */}
            {canManage && (
                <UploadTemplateDialog
                    open={uploadOpen}
                    onClose={closeUpload}
                    templateTypes={templateTypes}
                    existingTemplateNames={existingTemplateNames}
                    onUpload={handleUpload}
                />
            )}

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar(s => ({ ...s, open: false }))}
                message={snackbar.message}
            />
        </Box>
    );
}
