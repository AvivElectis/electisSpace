import { useState, useCallback, useRef, useEffect } from 'react';
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
    Chip,
    ToggleButton,
    ToggleButtonGroup,
    CircularProgress,
    Alert,
    Stack,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import {
    Close as CloseIcon,
    QrCodeScanner as ScannerIcon,
    CloudUpload as UploadIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { labelsApi } from '@shared/infrastructure/services/labelsApi';
import { loadImage, resizeImage, canvasToBase64 } from '../domain/imageUtils';
import type { LabelTypeInfo, FitMode } from '../domain/imageTypes';
import { BarcodeScanner } from './BarcodeScanner';
import { logger } from '@shared/infrastructure/services/logger';

interface AssignImageDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    initialLabelCode?: string;
}

export function AssignImageDialog({ open, onClose, onSuccess, initialLabelCode }: AssignImageDialogProps) {
    const { t } = useTranslation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const { activeStoreId } = useAuthStore();

    // State
    const [labelCode, setLabelCode] = useState(initialLabelCode || '');
    const [typeInfo, setTypeInfo] = useState<LabelTypeInfo | null>(null);
    const [isLoadingTypeInfo, setIsLoadingTypeInfo] = useState(false);
    const [typeInfoError, setTypeInfoError] = useState<string | null>(null);

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [fitMode, setFitMode] = useState<FitMode>('contain');
    const [resizedBase64, setResizedBase64] = useState<string | null>(null);

    const [ditherPreview, setDitherPreview] = useState<string | null>(null);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);
    const [previewError, setPreviewError] = useState<string | null>(null);

    const [isPushing, setIsPushing] = useState(false);
    const [pushError, setPushError] = useState<string | null>(null);
    const [pushSuccess, setPushSuccess] = useState(false);

    const [scannerOpen, setScannerOpen] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Reset state when dialog opens/closes
    useEffect(() => {
        if (open) {
            setLabelCode(initialLabelCode || '');
            setTypeInfo(null);
            setTypeInfoError(null);
            setSelectedFile(null);
            setResizedBase64(null);
            setDitherPreview(null);
            setPreviewError(null);
            setPushError(null);
            setPushSuccess(false);
        }
    }, [open, initialLabelCode]);

    // Fetch label type info when label code changes
    const fetchTypeInfo = useCallback(async (code: string) => {
        if (!activeStoreId || !code.trim()) return;

        setIsLoadingTypeInfo(true);
        setTypeInfoError(null);
        setTypeInfo(null);
        setResizedBase64(null);
        setDitherPreview(null);

        try {
            const response = await labelsApi.getLabelTypeInfo(activeStoreId, code.trim());
            setTypeInfo(response.data);
        } catch (error: any) {
            logger.error('AssignImageDialog', 'Failed to fetch type info', { error: error.message });
            setTypeInfoError(error.response?.data?.error?.message || error.message);
        } finally {
            setIsLoadingTypeInfo(false);
        }
    }, [activeStoreId]);

    // Process image when file or fit mode changes
    const processImage = useCallback(async (file: File, mode: FitMode, info: LabelTypeInfo) => {
        try {
            const img = await loadImage(file);
            const canvas = resizeImage(img, info.displayWidth, info.displayHeight, mode);
            const base64 = canvasToBase64(canvas);
            setResizedBase64(base64);
            return base64;
        } catch (error: any) {
            logger.error('AssignImageDialog', 'Failed to process image', { error: error.message });
            return null;
        }
    }, []);

    // Fetch dither preview
    const fetchDitherPreview = useCallback(async (base64: string, code: string) => {
        if (!activeStoreId) return;

        setIsLoadingPreview(true);
        setPreviewError(null);
        setDitherPreview(null);

        try {
            const response = await labelsApi.getDitherPreview(activeStoreId, code, base64);
            // AIMS returns the dithered image in responseMessage or as a direct image field
            const previewData = response.data?.responseMessage || response.data?.image || response.data;
            if (typeof previewData === 'string') {
                setDitherPreview(previewData);
            } else {
                setPreviewError(t('imageLabels.previewFailed', 'Could not generate preview'));
            }
        } catch (error: any) {
            logger.error('AssignImageDialog', 'Failed to fetch dither preview', { error: error.message });
            setPreviewError(error.response?.data?.error?.message || error.message);
        } finally {
            setIsLoadingPreview(false);
        }
    }, [activeStoreId, t]);

    // Handle file selection
    const handleFileSelect = async (file: File) => {
        setSelectedFile(file);
        setPushSuccess(false);
        setPushError(null);
        if (typeInfo) {
            const base64 = await processImage(file, fitMode, typeInfo);
            if (base64) {
                await fetchDitherPreview(base64, labelCode);
            }
        }
    };

    // Handle fit mode change
    const handleFitModeChange = async (_: React.MouseEvent<HTMLElement>, newMode: FitMode | null) => {
        if (!newMode) return;
        setFitMode(newMode);
        setPushSuccess(false);
        if (selectedFile && typeInfo) {
            const base64 = await processImage(selectedFile, newMode, typeInfo);
            if (base64) {
                await fetchDitherPreview(base64, labelCode);
            }
        }
    };

    // Handle label code submit
    const handleLabelCodeSubmit = () => {
        if (labelCode.trim()) {
            fetchTypeInfo(labelCode);
        }
    };

    // Handle barcode scan
    const handleScan = (value: string) => {
        setLabelCode(value);
        setScannerOpen(false);
        fetchTypeInfo(value);
    };

    // Handle image push
    const handlePush = async () => {
        if (!activeStoreId || !resizedBase64 || !labelCode.trim()) return;

        setIsPushing(true);
        setPushError(null);
        setPushSuccess(false);

        try {
            await labelsApi.pushImage(activeStoreId, labelCode.trim(), resizedBase64);
            setPushSuccess(true);
            logger.info('AssignImageDialog', 'Image pushed successfully', { labelCode });
            onSuccess?.();
        } catch (error: any) {
            logger.error('AssignImageDialog', 'Failed to push image', { error: error.message });
            setPushError(error.response?.data?.error?.message || error.message);
        } finally {
            setIsPushing(false);
        }
    };

    // Drag and drop handlers
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleFileSelect(file);
        }
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            handleFileSelect(file);
        }
    };

    return (
        <>
            <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={isMobile}>
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="h6">
                            {t('imageLabels.dialog.title', 'Assign Image to Label')}
                        </Typography>
                        <IconButton onClick={onClose} size="small">
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </DialogTitle>

                <DialogContent dividers>
                    <Stack spacing={3}>
                        {/* Section 1: Label Code */}
                        <Box>
                            <Typography variant="subtitle2" gutterBottom>
                                {t('imageLabels.dialog.labelCode', 'Label Code')}
                            </Typography>
                            <Stack direction="row" spacing={1}>
                                <TextField
                                    value={labelCode}
                                    onChange={(e) => setLabelCode(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleLabelCodeSubmit()}
                                    placeholder={t('imageLabels.dialog.labelCodePlaceholder', 'Enter or scan label code...')}
                                    size="small"
                                    fullWidth
                                    disabled={isLoadingTypeInfo}
                                />
                                <IconButton onClick={() => setScannerOpen(true)} color="primary">
                                    <ScannerIcon />
                                </IconButton>
                                <Button
                                    variant="outlined"
                                    onClick={handleLabelCodeSubmit}
                                    disabled={!labelCode.trim() || isLoadingTypeInfo}
                                    size="small"
                                >
                                    {isLoadingTypeInfo ? <CircularProgress size={20} /> : t('common.confirm', 'Confirm')}
                                </Button>
                            </Stack>

                            {typeInfoError && (
                                <Alert severity="error" sx={{ mt: 1 }}>
                                    {typeInfoError}
                                </Alert>
                            )}

                            {typeInfo && (
                                <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
                                    <Chip
                                        label={`${typeInfo.displayWidth}×${typeInfo.displayHeight} px`}
                                        size="small"
                                        color="primary"
                                        variant="outlined"
                                    />
                                    <Chip
                                        label={typeInfo.colorType}
                                        size="small"
                                        variant="outlined"
                                    />
                                    <Chip
                                        label={typeInfo.name}
                                        size="small"
                                        variant="outlined"
                                    />
                                    {typeInfo.nfc && (
                                        <Chip label="NFC" size="small" color="info" variant="outlined" />
                                    )}
                                </Stack>
                            )}
                        </Box>

                        {/* Section 2: Image Upload */}
                        {typeInfo && (
                            <Box>
                                <Typography variant="subtitle2" gutterBottom>
                                    {t('imageLabels.dialog.uploadImage', 'Upload Image')}
                                </Typography>
                                <Box
                                    onDragOver={handleDragOver}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    sx={{
                                        border: '2px dashed',
                                        borderColor: selectedFile ? 'primary.main' : 'divider',
                                        borderRadius: 2,
                                        p: 3,
                                        textAlign: 'center',
                                        cursor: 'pointer',
                                        bgcolor: 'action.hover',
                                        '&:hover': { borderColor: 'primary.main' },
                                    }}
                                >
                                    <UploadIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                                    <Typography variant="body2" color="text.secondary">
                                        {selectedFile
                                            ? selectedFile.name
                                            : t('imageLabels.dialog.dropOrClick', 'Drop an image here or click to browse')}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {t('imageLabels.dialog.acceptedFormats', 'PNG, JPEG, BMP')}
                                    </Typography>
                                </Box>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/png,image/jpeg,image/bmp"
                                    onChange={handleFileInputChange}
                                    style={{ display: 'none' }}
                                />
                            </Box>
                        )}

                        {/* Section 3: Fit Mode */}
                        {typeInfo && selectedFile && (
                            <Box>
                                <Typography variant="subtitle2" gutterBottom>
                                    {t('imageLabels.dialog.fitMode', 'Fit Mode')}
                                </Typography>
                                <ToggleButtonGroup
                                    value={fitMode}
                                    exclusive
                                    onChange={handleFitModeChange}
                                    size="small"
                                    fullWidth
                                >
                                    <ToggleButton value="contain">
                                        {t('imageLabels.dialog.fitContain', 'Contain')}
                                    </ToggleButton>
                                    <ToggleButton value="cover">
                                        {t('imageLabels.dialog.fitCover', 'Cover')}
                                    </ToggleButton>
                                    <ToggleButton value="fill">
                                        {t('imageLabels.dialog.fitFill', 'Fill')}
                                    </ToggleButton>
                                </ToggleButtonGroup>
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                    {fitMode === 'contain' && t('imageLabels.dialog.fitContainHelp', 'Fits image within label, may add white bars')}
                                    {fitMode === 'cover' && t('imageLabels.dialog.fitCoverHelp', 'Fills label completely, may crop image')}
                                    {fitMode === 'fill' && t('imageLabels.dialog.fitFillHelp', 'Stretches image to fill label exactly')}
                                </Typography>
                            </Box>
                        )}

                        {/* Section 4: Dithered Preview */}
                        {typeInfo && selectedFile && (
                            <Box>
                                <Typography variant="subtitle2" gutterBottom>
                                    {t('imageLabels.dialog.preview', 'Preview')}
                                </Typography>
                                {isLoadingPreview ? (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                                        <CircularProgress />
                                    </Box>
                                ) : previewError ? (
                                    <Alert severity="warning" sx={{ mb: 1 }}>
                                        {previewError}
                                    </Alert>
                                ) : null}

                                {/* Show resized image (always available if file is selected) */}
                                {resizedBase64 && (
                                    <Stack spacing={1} alignItems="center">
                                        {ditherPreview ? (
                                            <Box>
                                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mb: 0.5 }}>
                                                    {t('imageLabels.dialog.ditheredPreview', 'Dithered Preview (as it will appear on label)')}
                                                </Typography>
                                                <Box
                                                    component="img"
                                                    src={`data:image/png;base64,${ditherPreview}`}
                                                    alt={t('imageLabels.dialog.altDitheredPreview', 'Dithered preview')}
                                                    sx={{
                                                        maxWidth: '100%',
                                                        border: '2px solid',
                                                        borderColor: 'divider',
                                                        borderRadius: 1,
                                                        bgcolor: 'background.paper',
                                                    }}
                                                />
                                            </Box>
                                        ) : (
                                            <Box>
                                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mb: 0.5 }}>
                                                    {t('imageLabels.dialog.resizedPreview', 'Resized Preview')}
                                                </Typography>
                                                <Box
                                                    component="img"
                                                    src={`data:image/png;base64,${resizedBase64}`}
                                                    alt={t('imageLabels.dialog.altResizedPreview', 'Resized preview')}
                                                    sx={{
                                                        maxWidth: '100%',
                                                        border: '2px solid',
                                                        borderColor: 'divider',
                                                        borderRadius: 1,
                                                        bgcolor: 'background.paper',
                                                    }}
                                                />
                                            </Box>
                                        )}
                                    </Stack>
                                )}
                            </Box>
                        )}

                        {/* Push feedback */}
                        {pushError && (
                            <Alert severity="error">
                                {pushError}
                            </Alert>
                        )}
                        {pushSuccess && (
                            <Alert severity="success">
                                {t('imageLabels.dialog.pushSuccess', 'Image pushed to label successfully!')}
                            </Alert>
                        )}
                    </Stack>
                </DialogContent>

                <DialogActions>
                    <Button onClick={onClose} variant="outlined">
                        {t('common.close', 'Close')}
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handlePush}
                        disabled={!resizedBase64 || isPushing || !labelCode.trim()}
                        startIcon={isPushing ? <CircularProgress size={18} color="inherit" /> : undefined}
                    >
                        {t('imageLabels.dialog.pushButton', 'Push to Label')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Barcode Scanner */}
            <BarcodeScanner
                open={scannerOpen}
                onClose={() => setScannerOpen(false)}
                onScan={handleScan}
                title={t('imageLabels.dialog.scanLabel', 'Scan Label Code')}
            />
        </>
    );
}
