import { useState, useEffect, useRef, useCallback } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Typography,
    Alert,
    CircularProgress,
    ToggleButton,
    ToggleButtonGroup,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import {
    CameraAlt as CameraIcon,
    Close as CloseIcon,
    QrCodeScanner as ScannerIcon,
    Keyboard as KeyboardIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { logger } from '@shared/infrastructure/services/logger';
import type { ScanInputType } from '../domain/types';

interface BarcodeScannerProps {
    open: boolean;
    onClose: () => void;
    onScan: (value: string) => void;
    title?: string;
    placeholder?: string;
}

/**
 * BarcodeScanner component
 * Supports three input modes:
 * 1. Manual text input
 * 2. Camera scanning (for mobile devices)
 * 3. External barcode scanner (USB/Bluetooth)
 */
export function BarcodeScanner({ open, onClose, onScan, title, placeholder }: BarcodeScannerProps) {
    const { t } = useTranslation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [inputType, setInputType] = useState<ScanInputType>('scanner');
    const [value, setValue] = useState('');
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const scannerInputRef = useRef<HTMLInputElement>(null);
    const detectorRef = useRef<any>(null);
    const animFrameRef = useRef<number>(0);

    // Buffer for external scanner input (they type fast)
    const scanBufferRef = useRef('');
    const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Start camera for scanning
    const startCamera = useCallback(async () => {
        setCameraError(null);
        setIsCameraReady(false);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }, // Prefer rear camera
            });

            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current?.play();
                    setIsCameraReady(true);
                };
            }
            logger.info('BarcodeScanner', 'Camera started');
        } catch (error: any) {
            logger.error('BarcodeScanner', 'Camera access failed', { error: error.message });
            setCameraError(t('labels.scanner.cameraError', 'Camera access denied or not available'));
        }
    }, [t]);

    // Stop camera
    const stopCamera = useCallback(() => {
        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = 0;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsCameraReady(false);
        setIsScanning(false);
    }, []);

    // Real-time barcode detection loop using native BarcodeDetector API
    const startDetection = useCallback(() => {
        if (!('BarcodeDetector' in window)) {
            setCameraError(t('labels.scanner.noBarcodeDetector', 'Barcode detection not supported in this browser. Please use Manual mode.'));
            return;
        }

        try {
            detectorRef.current = new (window as any).BarcodeDetector({
                formats: ['code_128', 'ean_13', 'ean_8', 'qr_code', 'code_39'],
            });
        } catch (e: any) {
            logger.error('BarcodeScanner', 'BarcodeDetector init failed', { error: e.message });
            setCameraError(t('labels.scanner.noBarcodeDetector', 'Barcode detection not supported in this browser. Please use Manual mode.'));
            return;
        }

        setIsScanning(true);
        let detecting = false;

        const detect = async () => {
            if (!videoRef.current || !detectorRef.current || videoRef.current.readyState < 2) {
                animFrameRef.current = requestAnimationFrame(detect);
                return;
            }

            if (detecting) {
                animFrameRef.current = requestAnimationFrame(detect);
                return;
            }

            detecting = true;
            try {
                const barcodes = await detectorRef.current.detect(videoRef.current);
                if (barcodes.length > 0) {
                    const code = barcodes[0].rawValue;
                    logger.info('BarcodeScanner', 'Barcode detected', { value: code });
                    onScan(code);
                    onClose();
                    return; // Stop the loop
                }
            } catch (e: any) {
                // Detection can fail on individual frames — just continue
            }
            detecting = false;
            animFrameRef.current = requestAnimationFrame(detect);
        };

        animFrameRef.current = requestAnimationFrame(detect);
    }, [onScan, onClose, t]);

    // Handle input type change
    const handleInputTypeChange = (_: React.MouseEvent<HTMLElement>, newType: ScanInputType | null) => {
        if (newType) {
            setInputType(newType);
            setValue('');
            if (newType !== 'camera') {
                stopCamera();
            }
        }
    };

    // Handle external scanner input
    // External scanners act like keyboards and type very fast, usually ending with Enter
    const handleScannerKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const scannedValue = scanBufferRef.current.trim() || value.trim();
            if (scannedValue) {
                logger.info('BarcodeScanner', 'Scanner input received', { value: scannedValue });
                onScan(scannedValue);
                setValue('');
                scanBufferRef.current = '';
                onClose();
            }
        }
    }, [value, onScan, onClose]);

    // Track fast input from scanner
    const handleScannerInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setValue(newValue);

        // Add to buffer
        scanBufferRef.current = newValue;

        // Clear previous timeout
        if (scanTimeoutRef.current) {
            clearTimeout(scanTimeoutRef.current);
        }

        // Auto-submit after 100ms of no input (scanner typically finishes within 50ms)
        scanTimeoutRef.current = setTimeout(() => {
            if (scanBufferRef.current.trim()) {
                logger.info('BarcodeScanner', 'Auto-submit scanner input', { value: scanBufferRef.current });
                onScan(scanBufferRef.current.trim());
                setValue('');
                scanBufferRef.current = '';
                onClose();
            }
        }, 100);
    }, [onScan, onClose]);

    // Manual input submit
    const handleManualSubmit = () => {
        if (value.trim()) {
            onScan(value.trim());
            setValue('');
            onClose();
        }
    };

    // Focus scanner input when in scanner mode
    useEffect(() => {
        if (open && inputType === 'scanner' && scannerInputRef.current) {
            setTimeout(() => scannerInputRef.current?.focus(), 100);
        }
    }, [open, inputType]);

    // Start camera when camera mode is selected
    useEffect(() => {
        if (open && inputType === 'camera') {
            startCamera();
        }
        return () => {
            stopCamera();
        };
    }, [open, inputType, startCamera, stopCamera]);

    // Start barcode detection when camera is ready
    useEffect(() => {
        if (isCameraReady && inputType === 'camera' && open) {
            startDetection();
        }
    }, [isCameraReady, inputType, open, startDetection]);

    // Cleanup on close
    useEffect(() => {
        if (!open) {
            stopCamera();
            setValue('');
            scanBufferRef.current = '';
            if (scanTimeoutRef.current) {
                clearTimeout(scanTimeoutRef.current);
            }
        }
    }, [open, stopCamera]);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={isMobile}>
            <DialogTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="h6">
                        {title || t('labels.scanner.title', 'Scan Barcode')}
                    </Typography>
                    <IconButton onClick={onClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </Box>
            </DialogTitle>

            <DialogContent>
                {/* Input type selector */}
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                    <ToggleButtonGroup
                        value={inputType}
                        exclusive
                        onChange={handleInputTypeChange}
                        aria-label={t('labels.scanner.ariaInputType', 'scan input type')}
                        dir="ltr"
                    >
                        <ToggleButton value="scanner" aria-label={t('labels.scanner.ariaExternalScanner', 'external scanner')} sx={{ gap: 1 }}>
                            <ScannerIcon />
                            {t('labels.scanner.externalScanner', 'Scanner')}
                        </ToggleButton>
                        <ToggleButton value="camera" aria-label={t('labels.scanner.ariaCamera', 'camera')} sx={{ gap: 1 }}>
                            <CameraIcon />
                            {t('labels.scanner.camera', 'Camera')}
                        </ToggleButton>
                        <ToggleButton value="manual" aria-label={t('labels.scanner.ariaManualInput', 'manual input')} sx={{ gap: 1 }}>
                            <KeyboardIcon />
                            {t('labels.scanner.manual', 'Manual')}
                        </ToggleButton>
                    </ToggleButtonGroup>
                </Box>

                {/* Scanner mode - hidden input for scanner device */}
                {inputType === 'scanner' && (
                    <Box sx={{ textAlign: 'center' }}>
                        <Alert severity="info" sx={{ mb: 2 }}>
                            {t('labels.scanner.scannerInstructions', 'Point your barcode scanner at the code. The input field below will capture the scan.')}
                        </Alert>
                        <Box
                            sx={{
                                p: 4,
                                border: '2px dashed',
                                borderColor: 'primary.main',
                                borderRadius: 2,
                                bgcolor: 'action.hover',
                            }}
                        >
                            <ScannerIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
                            <Typography variant="body1" gutterBottom>
                                {t('labels.scanner.readyToScan', 'Ready to scan...')}
                            </Typography>
                            <input
                                ref={scannerInputRef}
                                value={value}
                                onChange={handleScannerInput}
                                onKeyDown={handleScannerKeyDown}
                                placeholder={placeholder || t('labels.scanner.placeholder', 'Scan or type code...')}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    fontSize: '18px',
                                    textAlign: 'center',
                                    border: '1px solid #ccc',
                                    borderRadius: '4px',
                                    marginTop: '16px',
                                }}
                                autoFocus
                            />
                        </Box>
                    </Box>
                )}

                {/* Camera mode */}
                {inputType === 'camera' && (
                    <Box sx={{ textAlign: 'center' }}>
                        {cameraError ? (
                            <Alert severity="error">{cameraError}</Alert>
                        ) : (
                            <>
                                <Box
                                    sx={{
                                        position: 'relative',
                                        width: '100%',
                                        ...(!isMobile && { maxWidth: 400 }),
                                        mx: 'auto',
                                        aspectRatio: isMobile ? '3/4' : '4/3',
                                        bgcolor: 'black',
                                        borderRadius: 2,
                                        overflow: 'hidden',
                                    }}
                                >
                                    <video
                                        ref={videoRef}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                        }}
                                        playsInline
                                        muted
                                    />
                                    {!isCameraReady && (
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                top: '50%',
                                                left: '50%',
                                                transform: 'translate(-50%, -50%)',
                                            }}
                                        >
                                            <CircularProgress />
                                        </Box>
                                    )}
                                    {/* Scan area overlay */}
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            top: '50%',
                                            left: '50%',
                                            transform: 'translate(-50%, -50%)',
                                            width: isMobile ? '80%' : '60%',
                                            height: '30%',
                                            border: '2px solid',
                                            borderColor: isScanning ? 'success.main' : 'grey.500',
                                            borderRadius: 1,
                                        }}
                                    />
                                </Box>
                                {isScanning && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mt: 2 }}>
                                        <CircularProgress size={16} />
                                        <Typography variant="body2" color="text.secondary">
                                            {t('labels.scanner.scanning', 'Scanning...')}
                                        </Typography>
                                    </Box>
                                )}
                                <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
                                    {t('labels.scanner.cameraHint', 'Position the barcode in the green area')}
                                </Typography>
                            </>
                        )}
                    </Box>
                )}

                {/* Manual mode */}
                {inputType === 'manual' && (
                    <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                            {t('labels.scanner.manualInstructions', 'Enter the code manually')}
                        </Typography>
                        <input
                            ref={inputRef}
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                            placeholder={placeholder || t('labels.scanner.placeholder', 'Enter code...')}
                            style={{
                                width: '100%',
                                padding: '16px',
                                fontSize: '20px',
                                textAlign: 'center',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                            }}
                            autoFocus
                        />
                    </Box>
                )}
            </DialogContent>

            <DialogActions sx={{ flexDirection: 'row', gap: 1 }}>
                <Button onClick={onClose} variant="outlined">
                    {t('common.cancel', 'Cancel')}
                </Button>
                {inputType === 'manual' && (
                    <Button variant="contained" onClick={handleManualSubmit} disabled={!value.trim()}>
                        {t('common.confirm', 'Confirm')}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
}
