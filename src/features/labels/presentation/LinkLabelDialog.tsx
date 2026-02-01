import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
    Typography,
    IconButton,
    InputAdornment,
    Alert,
    Autocomplete,
    CircularProgress,
} from '@mui/material';
import {
    QrCodeScanner as ScanIcon,
    Close as CloseIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { BarcodeScanner } from './BarcodeScanner';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';
import { fetchArticles } from '@shared/infrastructure/services/solum/articlesService';
import { logger } from '@shared/infrastructure/services/logger';

interface LinkLabelDialogProps {
    open: boolean;
    onClose: () => void;
    onLink: (labelCode: string, articleId: string, templateName?: string) => Promise<void>;
    initialLabelCode?: string;
    initialArticleId?: string;
}

interface Article {
    id: string;
    name?: string;
    [key: string]: any;
}

/**
 * Dialog for linking a label to an article
 * Supports manual input and barcode scanning
 */
export function LinkLabelDialog({ 
    open, 
    onClose, 
    onLink, 
    initialLabelCode = '',
    initialArticleId = '',
}: LinkLabelDialogProps) {
    const { t } = useTranslation();
    const solumConfig = useSettingsStore((state) => state.settings.solumConfig);
    
    const [labelCode, setLabelCode] = useState(initialLabelCode);
    const [articleId, setArticleId] = useState(initialArticleId);
    const [templateName, setTemplateName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Scanner state
    const [scannerOpen, setScannerOpen] = useState(false);
    const [scanTarget, setScanTarget] = useState<'label' | 'article'>('label');
    
    // Articles autocomplete
    const [articles, setArticles] = useState<Article[]>([]);
    const [loadingArticles, setLoadingArticles] = useState(false);

    // Reset form when dialog opens
    useEffect(() => {
        if (open) {
            setLabelCode(initialLabelCode);
            setArticleId(initialArticleId);
            setTemplateName('');
            setError(null);
        }
    }, [open, initialLabelCode, initialArticleId]);

    // Fetch articles for autocomplete
    useEffect(() => {
        const loadArticles = async () => {
            if (!open || !solumConfig?.tokens?.accessToken || !solumConfig.storeNumber) {
                return;
            }

            setLoadingArticles(true);
            try {
                const result = await fetchArticles(
                    solumConfig,
                    solumConfig.storeNumber,
                    solumConfig.tokens.accessToken,
                    0,
                    100
                );
                // Transform to Article format
                const articleList: Article[] = result.map((a: any) => ({
                    id: a.articleId || a.id,
                    name: a.articleName || a.name || a.data?.NFC_URL || '',
                    ...a,
                }));
                setArticles(articleList);
            } catch (err: any) {
                logger.error('LinkLabelDialog', 'Failed to fetch articles', { error: err.message });
            } finally {
                setLoadingArticles(false);
            }
        };

        loadArticles();
    }, [open, solumConfig]);

    const handleScanLabel = () => {
        setScanTarget('label');
        setScannerOpen(true);
    };

    const handleScanArticle = () => {
        setScanTarget('article');
        setScannerOpen(true);
    };

    const handleScanResult = (value: string) => {
        if (scanTarget === 'label') {
            setLabelCode(value);
        } else {
            setArticleId(value);
        }
        setScannerOpen(false);
    };

    const handleSubmit = async () => {
        setError(null);

        // Validation
        if (!labelCode.trim()) {
            setError(t('labels.link.labelRequired', 'Label code is required'));
            return;
        }
        if (!articleId.trim()) {
            setError(t('labels.link.articleRequired', 'Article ID is required'));
            return;
        }

        setIsSubmitting(true);
        try {
            await onLink(labelCode.trim(), articleId.trim(), templateName.trim() || undefined);
            onClose();
        } catch (err: any) {
            setError(err.message || t('labels.link.error', 'Failed to link label'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="h6">
                            {t('labels.link.title', 'Link Label to Article')}
                        </Typography>
                        <IconButton onClick={onClose} size="small" disabled={isSubmitting}>
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </DialogTitle>

                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
                        {error && (
                            <Alert severity="error" onClose={() => setError(null)}>
                                {error}
                            </Alert>
                        )}

                        {/* Label Code Input */}
                        <TextField
                            label={t('labels.link.labelCode', 'Label Code')}
                            value={labelCode}
                            onChange={(e) => setLabelCode(e.target.value)}
                            placeholder="e.g., 03704160B297"
                            fullWidth
                            required
                            disabled={isSubmitting}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={handleScanLabel}
                                            edge="end"
                                            title={t('labels.scanner.scan', 'Scan')}
                                            disabled={isSubmitting}
                                        >
                                            <ScanIcon />
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                            helperText={t('labels.link.labelCodeHelp', 'Enter label code or scan barcode')}
                        />

                        {/* Article ID Input with Autocomplete */}
                        <Autocomplete
                            freeSolo
                            options={articles}
                            getOptionLabel={(option) => {
                                if (typeof option === 'string') return option;
                                return option.name ? `${option.id} - ${option.name}` : option.id;
                            }}
                            inputValue={articleId}
                            onInputChange={(_, value) => setArticleId(value)}
                            loading={loadingArticles}
                            disabled={isSubmitting}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label={t('labels.link.articleId', 'Article ID (Product)')}
                                    placeholder="e.g., SPACE-001"
                                    required
                                    InputProps={{
                                        ...params.InputProps,
                                        endAdornment: (
                                            <>
                                                {loadingArticles && <CircularProgress size={20} />}
                                                {params.InputProps.endAdornment}
                                                <InputAdornment position="end">
                                                    <IconButton
                                                        onClick={handleScanArticle}
                                                        edge="end"
                                                        title={t('labels.scanner.scan', 'Scan')}
                                                        disabled={isSubmitting}
                                                    >
                                                        <ScanIcon />
                                                    </IconButton>
                                                </InputAdornment>
                                            </>
                                        ),
                                    }}
                                    helperText={t('labels.link.articleIdHelp', 'Enter article/product ID or scan barcode')}
                                />
                            )}
                            renderOption={(props, option) => (
                                <li {...props} key={option.id}>
                                    <Box>
                                        <Typography variant="body1">{option.id}</Typography>
                                        {option.name && (
                                            <Typography variant="caption" color="text.secondary">
                                                {option.name}
                                            </Typography>
                                        )}
                                    </Box>
                                </li>
                            )}
                        />

                        {/* Template Name (Optional) */}
                        <TextField
                            label={t('labels.link.templateName', 'Template Name (Optional)')}
                            value={templateName}
                            onChange={(e) => setTemplateName(e.target.value)}
                            placeholder="e.g., DEFAULT"
                            fullWidth
                            disabled={isSubmitting}
                            helperText={t('labels.link.templateNameHelp', 'Leave empty to use default template')}
                        />
                    </Box>
                </DialogContent>

                <DialogActions>
                    <Button onClick={onClose} disabled={isSubmitting}>
                        {t('common.cancel', 'Cancel')}
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSubmit}
                        disabled={isSubmitting || !labelCode.trim() || !articleId.trim()}
                    >
                        {isSubmitting ? (
                            <CircularProgress size={24} />
                        ) : (
                            t('labels.link.linkButton', 'Link Label')
                        )}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Barcode Scanner Dialog */}
            <BarcodeScanner
                open={scannerOpen}
                onClose={() => setScannerOpen(false)}
                onScan={handleScanResult}
                title={
                    scanTarget === 'label'
                        ? t('labels.scanner.scanLabel', 'Scan Label Code')
                        : t('labels.scanner.scanArticle', 'Scan Article ID')
                }
            />
        </>
    );
}
