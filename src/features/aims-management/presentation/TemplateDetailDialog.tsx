/**
 * Template Detail Dialog
 *
 * Shows template metadata, mapping conditions, and associated group info.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button,
    Typography, Box, Tabs, Tab, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper, Chip, IconButton,
    Stack,
} from '@mui/material';
import Close from '@mui/icons-material/Close';

interface TemplateDetailDialogProps {
    open: boolean;
    onClose: () => void;
    template: any;
    templateMappings: any[];
    templateGroups: any[];
}

export function TemplateDetailDialog({ open, onClose, template, templateMappings, templateGroups }: TemplateDetailDialogProps) {
    const { t } = useTranslation();
    const [tab, setTab] = useState(0);

    if (!template) return null;

    const templateName = template.templateName || template.name || '';
    const labelType = template.labelType || template.type || '';
    const width = template.width ?? '';
    const height = template.height ?? '';
    const colorMode = template.colorType || template.colorMode || template.color || '';
    const dithering = template.dithering ?? template.ditheringYn ?? false;

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

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6">{t('aims.templateDetail')}</Typography>
                    <IconButton onClick={onClose} size="small"><Close /></IconButton>
                </Box>
            </DialogTitle>
            <DialogContent dividers>
                {/* Template metadata */}
                <Box sx={{ mb: 2 }}>
                    <Typography variant="body1" fontWeight="bold" fontFamily="monospace">
                        {templateName}
                    </Typography>
                    {labelType && (
                        <Chip label={labelType} size="small" sx={{ mt: 1, mr: 1 }} />
                    )}
                    {colorMode && (
                        <Chip label={colorMode} size="small" variant="outlined" sx={{ mt: 1, mr: 1 }} />
                    )}
                    <Chip
                        label={t('aims.templateDithering')}
                        size="small"
                        variant="outlined"
                        color={dithering ? 'success' : 'default'}
                        sx={{ mt: 1 }}
                    />
                </Box>

                {/* Dimensions */}
                {(width || height) && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {t('aims.templateDimensions')}: {width} x {height}
                    </Typography>
                )}

                <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tab label={t('common.details') || 'Details'} />
                    <Tab label={t('aims.templateMappings')} />
                    <Tab label={t('aims.templateGroups')} />
                </Tabs>

                {/* Details tab */}
                {tab === 0 && (
                    <Box sx={{ mt: 2, maxHeight: 350, overflow: 'auto' }}>
                        <Table size="small">
                            <TableBody>
                                {Object.entries(template)
                                    .filter(([key]) => typeof template[key] !== 'object' || template[key] === null)
                                    .map(([key, value]) => (
                                        <TableRow key={key}>
                                            <TableCell sx={{ fontWeight: 600, width: '40%' }}>{key}</TableCell>
                                            <TableCell>
                                                {typeof value === 'boolean'
                                                    ? value ? 'Yes' : 'No'
                                                    : String(value ?? '\u2014')}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                            </TableBody>
                        </Table>
                    </Box>
                )}

                {/* Mapping conditions tab */}
                {tab === 1 && (
                    <Box sx={{ mt: 2 }}>
                        {relatedMappings.length > 0 ? (
                            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 350 }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>{t('aims.templateName')}</TableCell>
                                            <TableCell>{t('aims.templateType')}</TableCell>
                                            <TableCell>{t('aims.status')}</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {relatedMappings.map((mapping: any, i: number) => (
                                            <TableRow key={i}>
                                                <TableCell>
                                                    <Typography variant="body2" fontFamily="monospace">
                                                        {mapping.templateName || mapping.name || '\u2014'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>{mapping.labelType || mapping.type || '\u2014'}</TableCell>
                                                <TableCell>
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
                            <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                                {t('aims.noTemplates')}
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
                            <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                                {t('aims.noTemplates')}
                            </Typography>
                        )}
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{t('common.close')}</Button>
            </DialogActions>
        </Dialog>
    );
}
