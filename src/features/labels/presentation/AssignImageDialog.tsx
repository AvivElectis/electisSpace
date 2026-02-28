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
    RotateRight as RotateIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { labelsApi } from '@shared/infrastructure/services/labelsApi';
import { loadImage, resizeImage, rotateCanvas, canvasToBase64 } from '../domain/imageUtils';
import { ditherImage } from '../domain/ditherUtils';
import type { LabelTypeInfo, FitMode } from '../domain/imageTypes';
import { BarcodeScanner } from './BarcodeScanner';
import { LabelMockup } from './LabelMockup';
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
    const [rotation, setRotation] = useState(0); // 0-3 for 0°/90°/180°/270°
    const [resizedBase64, setResizedBase64] = useState<string | null>(null);
    const [ditheredBase64, setDitheredBase64] = useState<string | null>(null);
    const [imageError, setImageError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

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
            setRotation(0);
            setResizedBase64(null);
            setDitheredBase64(null);
            setImageError(null);
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
        setDitheredBase64(null);

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

    // Process image: resize, optionally rotate, then apply client-side dithering
    const processImage = useCallback(async (file: File, mode: FitMode, info: LabelTypeInfo, rotationSteps: number) => {
        setImageError(null);
        setIsProcessing(true);
        try {
            const img = await loadImage(file);
            let canvas = resizeImage(img, info.displayWidth, info.displayHeight, mode);
            if (rotationSteps > 0) {
                canvas = rotateCanvas(canvas, rotationSteps);
            }
            const base64 = canvasToBase64(canvas);
            setResizedBase64(base64);

            // Client-side Floyd-Steinberg dithering for instant preview
            const ditheredCanvas = ditherImage(canvas, info.color);
            const ditheredB64 = canvasToBase64(ditheredCanvas);
            setDitheredBase64(ditheredB64);

            return base64;
        } catch (error: any) {
            logger.error('AssignImageDialog', 'Failed to process image', { error: error.message });
            setResizedBase64(null);
            setDitheredBase64(null);
            setImageError(error.message);
            return null;
        } finally {
            setIsProcessing(false);
        }
    }, []);

    // Handle file selection
    const handleFileSelect = async (file: File) => {
        setSelectedFile(file);
        setPushSuccess(false);
        setPushError(null);
        if (typeInfo) {
            await processImage(file, fitMode, typeInfo, rotation);
        }
    };

    // Handle fit mode change
    const handleFitModeChange = async (_: React.MouseEvent<HTMLElement>, newMode: FitMode | null) => {
        if (!newMode) return;
        setFitMode(newMode);
        setPushSuccess(false);
        if (selectedFile && typeInfo) {
            await processImage(selectedFile, newMode, typeInfo, rotation);
        }
    };

    // Handle rotation (90° clockwise each press)
    const handleRotate = async () => {
        const newRotation = (rotation + 1) % 4;
        setRotation(newRotation);
        setPushSuccess(false);
        if (selectedFile && typeInfo) {
            await processImage(selectedFile, fitMode, typeInfo, newRotation);
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

    const rotationLabel = rotation > 0 ? `${rotation * 90}°` : '';

    return (
        <>
            <Dialog
                open={open}
                onClose={onClose}
                maxWidth="sm"
                fullWidth
                fullScreen={isMobile}
                disableAutoFocus
                disableRestoreFocus
                disableEnforceFocus
            >
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
                                    {typeInfo.displayWidth > 0 && typeInfo.displayHeight > 0 && (
                                        <Chip
                                            label={`${typeInfo.displayWidth}×${typeInfo.displayHeight} px`}
                                            size="small"
                                            color="primary"
                                            variant="outlined"
                                        />
                                    )}
                                    {typeInfo.colorType && (
                                        <Chip
                                            label={typeInfo.colorType}
                                            size="small"
                                            variant="outlined"
                                        />
                                    )}
                                    {typeInfo.name && (
                                        <Chip
                                            label={typeInfo.name}
                                            size="small"
                                            variant="outlined"
                                        />
                                    )}
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
                                        position: 'relative',
                                        '&:hover': { borderColor: 'primary.main' },
                                    }}
                                >
                                    {isProcessing && (
                                        <Box sx={{
                                            position: 'absolute',
                                            inset: 0,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            bgcolor: 'rgba(255,255,255,0.7)',
                                            borderRadius: 2,
                                            zIndex: 1,
                                        }}>
                                            <CircularProgress />
                                        </Box>
                                    )}
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

                        {imageError && (
                            <Alert severity="error">
                                {imageError}
                            </Alert>
                        )}

                        {/* Section 3: Fit Mode & Rotate */}
                        {typeInfo && selectedFile && (
                            <Box>
                                <Typography variant="subtitle2" gutterBottom>
                                    {t('imageLabels.dialog.fitMode', 'Fit Mode')}
                                </Typography>
                                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                                    <ToggleButtonGroup
                                        value={fitMode}
                                        exclusive
                                        onChange={handleFitModeChange}
                                        size="small"
                                        dir="ltr"
                                        aria-label={t('imageLabels.dialog.ariaFitMode', 'image fit mode')}
                                    >
                                        <ToggleButton value="contain" sx={{ gap: 0.5 }}>
                                            {t('imageLabels.dialog.fitContain', 'Contain')}
                                        </ToggleButton>
                                        <ToggleButton value="cover" sx={{ gap: 0.5 }}>
                                            {t('imageLabels.dialog.fitCover', 'Cover')}
                                        </ToggleButton>
                                        <ToggleButton value="fill" sx={{ gap: 0.5 }}>
                                            {t('imageLabels.dialog.fitFill', 'Fill')}
                                        </ToggleButton>
                                    </ToggleButtonGroup>
                                    <IconButton
                                        onClick={handleRotate}
                                        size="small"
                                        color={rotation > 0 ? 'primary' : 'default'}
                                        title={t('imageLabels.dialog.rotateTooltip', 'Rotate 90°')}
                                        sx={{ ml: 1 }}
                                    >
                                        <RotateIcon />
                                        {rotationLabel && (
                                            <Typography variant="caption" sx={{ fontSize: '0.65rem', ml: 0.25 }}>
                                                {rotationLabel}
                                            </Typography>
                                        )}
                                    </IconButton>
                                </Box>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
                                    {fitMode === 'contain' && t('imageLabels.dialog.fitContainHelp', 'Fits image within label, may add white bars')}
                                    {fitMode === 'cover' && t('imageLabels.dialog.fitCoverHelp', 'Fills label completely, may crop image')}
                                    {fitMode === 'fill' && t('imageLabels.dialog.fitFillHelp', 'Stretches image to fill label exactly')}
                                </Typography>
                            </Box>
                        )}

                        {/* Section 4: Label Preview — client-side dithered mockup */}
                        {typeInfo && ditheredBase64 && (
                            <Box>
                                <Typography variant="subtitle2" gutterBottom>
                                    {t('imageLabels.dialog.labelPreview', 'Label Preview')}
                                </Typography>
                                <LabelMockup
                                    imageSrc={`data:image/png;base64,${ditheredBase64}`}
                                    displayWidth={typeInfo.displayWidth}
                                    displayHeight={typeInfo.displayHeight}
                                    modelName={typeInfo.name}
                                    colorType={typeInfo.colorType}
                                />
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

                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={onClose}>
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
