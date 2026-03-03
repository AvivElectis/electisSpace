/**
 * Template Detail Dialog
 *
 * Shows template metadata, mapping conditions, and associated group info.
 * Supports downloading XSL/JSON files and editing (re-uploading) template files.
 * Properly supports RTL (Hebrew) with LTR dimensions/resolutions.
 */

import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button,
    Typography, Box, Tabs, Tab, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper, Chip, IconButton,
    Stack, CircularProgress, useMediaQuery, useTheme, Alert,
} from '@mui/material';
import Close from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import EditIcon from '@mui/icons-material/Edit';
import UploadFileIcon from '@mui/icons-material/UploadFile';

interface TemplateDetailDialogProps {
    open: boolean;
    onClose: () => void;
    template: any;
    templateMappings: any[];
    templateGroups: any[];
    onDownload?: (templateName: string, version: number, fileType: 'XSL' | 'JSON') => Promise<any>;
    canManage?: boolean;
    onUpdateFiles?: (templateData: Record<string, any>) => Promise<void>;
}

function triggerBlobDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.includes(',') ? result.split(',')[1] : result;
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export function TemplateDetailDialog({ open, onClose, template, templateMappings, templateGroups, onDownload, canManage, onUpdateFiles }: TemplateDetailDialogProps) {
    const { t, i18n } = useTranslation();
    const theme = useTheme();
    const isRtl = i18n.language === 'he';
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [tab, setTab] = useState(0);
    const [downloading, setDownloading] = useState<string | null>(null);
    const [downloadError, setDownloadError] = useState<string | null>(null);

    // Edit mode state
    const [editing, setEditing] = useState(false);
    const [xslFile, setXslFile] = useState<File | null>(null);
    const [jsonFile, setJsonFile] = useState<File | null>(null);
    const [fileError, setFileError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const xslInputRef = useRef<HTMLInputElement>(null);
    const jsonInputRef = useRef<HTMLInputElement>(null);

    if (!template) return null;

    const handleDownload = async (fileType: 'XSL' | 'JSON' | 'BOTH') => {
        if (!onDownload || !template) return;
        const name = template.templateName || template.name || '';
        const version = template.version ?? template.templateVersion ?? 0;
        // Strip existing file extension to avoid double extensions (e.g. .xsl.xsl)
        const baseName = name.replace(/\.(xsl|xslt|json|xml|dat)$/i, '');
        setDownloading(fileType);
        setDownloadError(null);
        try {
            if (fileType === 'BOTH') {
                const [xslBlob, jsonBlob] = await Promise.all([
                    onDownload(name, version, 'XSL'),
                    onDownload(name, version, 'JSON'),
                ]);
                if (xslBlob) triggerBlobDownload(xslBlob instanceof Blob ? xslBlob : new Blob([xslBlob]), `${baseName}.xsl`);
                if (jsonBlob) triggerBlobDownload(jsonBlob instanceof Blob ? jsonBlob : new Blob([jsonBlob]), `${baseName}.json`);
            } else {
                const blob = await onDownload(name, version, fileType);
                if (blob) {
                    const ext = fileType === 'XSL' ? 'xsl' : 'json';
                    triggerBlobDownload(blob instanceof Blob ? blob : new Blob([blob]), `${baseName}.${ext}`);
                }
            }
        } catch {
            setDownloadError(t('aims.uploadTemplateFailed'));
        } finally {
            setDownloading(null);
        }
    };

    const handleCancelEdit = () => {
        setEditing(false);
        setXslFile(null);
        setJsonFile(null);
        setFileError(null);
    };

    const handleSaveFiles = async () => {
        if (!xslFile || !jsonFile) {
            setFileError(t('aims.bothFilesRequired'));
            return;
        }
        if (!onUpdateFiles) return;

        setFileError(null);
        setSaving(true);
        try {
            const [xslBase64, jsonBase64] = await Promise.all([
                fileToBase64(xslFile),
                fileToBase64(jsonFile),
            ]);

            const name = template.templateName || template.name || '';
            const labelType = template.labelType || template.type || '';
            const width = String(template.width ?? '');
            const height = String(template.height ?? '');

            await onUpdateFiles({
                data: xslBase64,
                jsonData: jsonBase64,
                templateName: name,
                labelType,
                fileType: '.dat',
                width,
                height,
                tagImageUpdateRequired: false,
                templateModel: '',
                templateModelSize: '',
                color: template.colorType || template.colorMode || template.color || 'BW',
                dithering: template.dithering ?? template.ditheringYn ?? false,
            });

            handleCancelEdit();
        } catch {
            // error handled by caller
        } finally {
            setSaving(false);
        }
    };

    const templateName = template.templateName || template.name || '';
    const labelType = template.labelType || template.type || '';
    const width = template.width ?? '';
    const height = template.height ?? '';
    const colorMode = template.colorType || template.colorMode || template.color || '';

    // Find mapping conditions for this template
    const relatedMappings = templateMappings.filter(
        (m: any) => (m.templateName || m.name) === templateName
    );

    // Find groups that include this template
    const relatedGroups = templateGroups.filter(
        (g: any) => {
            const templates = g.templates || g.templateList || [];
            return templates.some?.((t: any) =>
                (t.templateName || t.name || t) === templateName
            ) || (g.templateName || g.name) === templateName;
        }
    );

    // Chip spacing that respects RTL
    const chipGap = isRtl ? { mt: 1, ml: 1 } : { mt: 1, mr: 1 };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            fullScreen={isMobile}
            dir={isRtl ? 'rtl' : 'ltr'}
        >
            <DialogTitle sx={{ pb: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6">{t('aims.templateDetail')}</Typography>
                    <IconButton onClick={onClose} size="small" aria-label={t('common.close')}>
                        <Close />
                    </IconButton>
                </Box>
            </DialogTitle>
            <DialogContent dividers sx={{ p: { xs: 1.5, sm: 3 } }}>
                {/* Download error */}
                {downloadError && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setDownloadError(null)}>
                        {downloadError}
                    </Alert>
                )}

                {/* Template metadata */}
                <Box sx={{ mb: 2 }}>
                    <Typography variant="body1" fontWeight="bold" fontFamily="monospace" dir="ltr"
                        sx={{ textAlign: isRtl ? 'right' : 'left' }}
                    >
                        {templateName}
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                        {labelType && (
                            <Chip label={labelType} size="small" sx={chipGap} />
                        )}
                        {colorMode && (
                            <Chip label={colorMode} size="small" variant="outlined" sx={chipGap} />
                        )}
                    </Box>
                </Box>

                {/* Dimensions — always LTR */}
                {(width || height) && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {t('aims.templateDimensions')}:{' '}
                        <Box component="span" dir="ltr" sx={{ unicodeBidi: 'embed' }}>
                            {width} x {height}
                        </Box>
                    </Typography>
                )}

                {/* Edit files section */}
                {editing && (
                    <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'action.hover' }}>
                        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                            {t('aims.updateTemplateFiles')}
                        </Typography>
                        <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                                    {t('aims.xslFile')} *
                                </Typography>
                                <input
                                    ref={xslInputRef}
                                    type="file"
                                    accept=".xsl,.xslt,.xml"
                                    style={{ display: 'none' }}
                                    onChange={(e) => { setXslFile(e.target.files?.[0] ?? null); setFileError(null); }}
                                />
                                <Button
                                    variant="outlined"
                                    size={isMobile ? 'medium' : 'small'}
                                    startIcon={<UploadFileIcon />}
                                    onClick={() => xslInputRef.current?.click()}
                                    fullWidth
                                    sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
                                >
                                    {xslFile ? xslFile.name : t('aims.selectFile')}
                                </Button>
                            </Box>
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                                    {t('aims.jsonFile')} *
                                </Typography>
                                <input
                                    ref={jsonInputRef}
                                    type="file"
                                    accept=".json"
                                    style={{ display: 'none' }}
                                    onChange={(e) => { setJsonFile(e.target.files?.[0] ?? null); setFileError(null); }}
                                />
                                <Button
                                    variant="outlined"
                                    size={isMobile ? 'medium' : 'small'}
                                    startIcon={<UploadFileIcon />}
                                    onClick={() => jsonInputRef.current?.click()}
                                    fullWidth
                                    sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
                                >
                                    {jsonFile ? jsonFile.name : t('aims.selectFile')}
                                </Button>
                            </Box>
                        </Stack>
                        {fileError && (
                            <Typography color="error" variant="body2" sx={{ mt: 1 }}>{fileError}</Typography>
                        )}
                        <Stack direction="row" gap={1} justifyContent="flex-end" sx={{ mt: 2 }}>
                            <Button size={isMobile ? 'medium' : 'small'} onClick={handleCancelEdit} disabled={saving}>
                                {t('common.cancel')}
                            </Button>
                            <Button
                                size={isMobile ? 'medium' : 'small'}
                                variant="contained"
                                onClick={handleSaveFiles}
                                disabled={saving || !xslFile || !jsonFile}
                                startIcon={saving ? <CircularProgress size={14} /> : undefined}
                            >
                                {t('aims.updateTemplateFiles')}
                            </Button>
                        </Stack>
                    </Paper>
                )}

                <Tabs
                    value={tab}
                    onChange={(_, v) => setTab(v)}
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                    variant={isMobile ? 'fullWidth' : 'standard'}
                >
                    <Tab label={t('common.details')} />
                    <Tab label={t('aims.templateMappings')} />
                    <Tab label={t('aims.templateGroups')} />
                </Tabs>

                {/* Details tab */}
                {tab === 0 && (
                    <Box sx={{ mt: 2, maxHeight: { xs: 'none', sm: 350 }, overflow: 'auto' }}>
                        <Table size="small">
                            <TableBody>
                                {Object.entries(template)
                                    .filter(([key]) => typeof template[key] !== 'object' || template[key] === null)
                                    .map(([key, value]) => {
                                        // Dimensions and numeric fields always LTR
                                        const isNumericOrDimension = key === 'width' || key === 'height' || key === 'version'
                                            || key === 'templateVersion' || typeof value === 'number';
                                        return (
                                            <TableRow key={key}>
                                                <TableCell sx={{ fontWeight: 600, width: '40%', textAlign: 'start' }}>
                                                    {key}
                                                </TableCell>
                                                <TableCell sx={{ textAlign: 'start' }}>
                                                    {typeof value === 'boolean'
                                                        ? value ? t('common.yes') : t('common.no')
                                                        : isNumericOrDimension
                                                            ? <Box component="span" dir="ltr" sx={{ unicodeBidi: 'embed' }}>{String(value ?? '\u2014')}</Box>
                                                            : String(value ?? '\u2014')
                                                    }
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                            </TableBody>
                        </Table>
                    </Box>
                )}

                {/* Mapping conditions tab */}
                {tab === 1 && (
                    <Box sx={{ mt: 2 }}>
                        {relatedMappings.length > 0 ? (
                            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: { xs: 'none', sm: 350 } }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ textAlign: 'start' }}>{t('aims.templateName')}</TableCell>
                                            <TableCell sx={{ textAlign: 'start' }}>{t('aims.templateType')}</TableCell>
                                            <TableCell sx={{ textAlign: 'start' }}>{t('aims.mappingCondition')}</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {relatedMappings.map((mapping: any, i: number) => (
                                            <TableRow key={i}>
                                                <TableCell sx={{ textAlign: 'start' }}>
                                                    <Typography variant="body2" fontFamily="monospace" dir="ltr"
                                                        sx={{ textAlign: isRtl ? 'right' : 'left' }}
                                                    >
                                                        {mapping.templateName || mapping.name || '\u2014'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell sx={{ textAlign: 'start' }}>{mapping.labelType || mapping.type || '\u2014'}</TableCell>
                                                <TableCell sx={{ textAlign: 'start' }}>
                                                    {mapping.condition || mapping.mappingCondition
                                                        ? <Chip label={mapping.condition || mapping.mappingCondition} size="small" variant="outlined" />
                                                        : '\u2014'}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        ) : (
                            <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                                {t('aims.noMappings')}
                            </Typography>
                        )}
                    </Box>
                )}

                {/* Groups tab */}
                {tab === 2 && (
                    <Box sx={{ mt: 2 }}>
                        {relatedGroups.length > 0 ? (
                            <Stack gap={1}>
                                {relatedGroups.map((group: any, i: number) => (
                                    <Paper key={i} variant="outlined" sx={{ p: 1.5 }}>
                                        <Typography variant="body2" fontWeight={600}>
                                            {group.groupName || group.name || `${t('aims.templateGroupName')} ${i + 1}`}
                                        </Typography>
                                        {group.description && (
                                            <Typography variant="caption" color="text.secondary">
                                                {group.description}
                                            </Typography>
                                        )}
                                        {(group.templates || group.templateList) && (
                                            <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 1 }}>
                                                {(group.templates || group.templateList || []).map((tmpl: any, j: number) => (
                                                    <Chip
                                                        key={j}
                                                        label={typeof tmpl === 'string' ? tmpl : tmpl.templateName || tmpl.name || ''}
                                                        size="small"
                                                        variant="outlined"
                                                        sx={{ fontFamily: 'monospace' }}
                                                    />
                                                ))}
                                            </Stack>
                                        )}
                                    </Paper>
                                ))}
                            </Stack>
                        ) : (
                            <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                                {t('aims.noGroups')}
                            </Typography>
                        )}
                    </Box>
                )}
            </DialogContent>
            <DialogActions sx={{
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: isMobile ? 'stretch' : 'center',
                gap: 1,
                p: { xs: 1.5, sm: 2 },
            }}>
                {onDownload && (
                    <Stack
                        direction={isMobile ? 'column' : 'row'}
                        gap={1}
                        sx={{ flex: isMobile ? undefined : 1, width: isMobile ? '100%' : undefined }}
                    >
                        <Button
                            size={isMobile ? 'medium' : 'small'}
                            startIcon={downloading === 'XSL' ? <CircularProgress size={16} /> : <DownloadIcon />}
                            onClick={() => handleDownload('XSL')}
                            disabled={!!downloading}
                            fullWidth={isMobile}
                        >
                            {t('aims.downloadXsl')}
                        </Button>
                        <Button
                            size={isMobile ? 'medium' : 'small'}
                            startIcon={downloading === 'JSON' ? <CircularProgress size={16} /> : <DownloadIcon />}
                            onClick={() => handleDownload('JSON')}
                            disabled={!!downloading}
                            fullWidth={isMobile}
                        >
                            {t('aims.downloadJson')}
                        </Button>
                        <Button
                            size={isMobile ? 'medium' : 'small'}
                            variant="outlined"
                            startIcon={downloading === 'BOTH' ? <CircularProgress size={16} /> : <DownloadIcon />}
                            onClick={() => handleDownload('BOTH')}
                            disabled={!!downloading}
                            fullWidth={isMobile}
                        >
                            {t('aims.downloadBoth')}
                        </Button>
                    </Stack>
                )}
                <Stack
                    direction={isMobile ? 'column' : 'row'}
                    gap={1}
                    sx={{ width: isMobile ? '100%' : undefined }}
                >
                    {canManage && onUpdateFiles && !editing && (
                        <Button
                            size={isMobile ? 'medium' : 'small'}
                            startIcon={<EditIcon />}
                            onClick={() => setEditing(true)}
                            fullWidth={isMobile}
                        >
                            {t('aims.editTemplate')}
                        </Button>
                    )}
                    <Button
                        onClick={onClose}
                        size={isMobile ? 'medium' : 'small'}
                        fullWidth={isMobile}
                    >
                        {t('common.close')}
                    </Button>
                </Stack>
            </DialogActions>
        </Dialog>
    );
}
