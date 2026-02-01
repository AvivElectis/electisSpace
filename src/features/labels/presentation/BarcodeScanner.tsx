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
    const [inputType, setInputType] = useState<ScanInputType>('scanner');
    const [value, setValue] = useState('');
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [isCameraReady, setIsCameraReady] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const scannerInputRef = useRef<HTMLInputElement>(null);

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
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsCameraReady(false);
    }, []);

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

    // Handle camera capture (simplified - in production use a barcode library like zxing-js)
    const handleCameraCapture = useCallback(async () => {
        // For now, prompt user to enter code manually after viewing
        // In production, integrate with @zxing/library for real barcode scanning
        const code = window.prompt(t('labels.scanner.enterCodeFromCamera', 'Enter the code you see:'));
        if (code) {
            onScan(code.trim());
            onClose();
        }
    }, [onScan, onClose, t]);

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
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
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
                        aria-label="scan input type"
                    >
                        <ToggleButton value="scanner" aria-label="external scanner">
                            <ScannerIcon sx={{ mr: 1 }} />
                            {t('labels.scanner.externalScanner', 'Scanner')}
                        </ToggleButton>
                        <ToggleButton value="camera" aria-label="camera">
                            <CameraIcon sx={{ mr: 1 }} />
                            {t('labels.scanner.camera', 'Camera')}
                        </ToggleButton>
                        <ToggleButton value="manual" aria-label="manual input">
                            <KeyboardIcon sx={{ mr: 1 }} />
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
                                        maxWidth: 400,
                                        mx: 'auto',
                                        aspectRatio: '4/3',
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
                                            width: '60%',
                                            height: '30%',
                                            border: '2px solid',
                                            borderColor: 'success.main',
                                            borderRadius: 1,
                                        }}
                                    />
                                </Box>
                                <Button
                                    variant="contained"
                                    onClick={handleCameraCapture}
                                    disabled={!isCameraReady}
                                    sx={{ mt: 2 }}
                                >
                                    {t('labels.scanner.capture', 'Capture')}
                                </Button>
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

            <DialogActions>
                <Button onClick={onClose}>
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
