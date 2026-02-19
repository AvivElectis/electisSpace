import { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    CircularProgress,
    Alert,
    Tabs,
    Tab,
    Chip,
    ImageList,
    ImageListItem,
    ImageListItemBar,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import {
    Image as ImageIcon,
    CheckCircle as SuccessIcon,
    HourglassEmpty as ProcessingIcon,
    Error as TimeoutIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import type { LabelImagesDetail, LabelImage } from '../domain/types';

interface LabelImagesDialogProps {
    open: boolean;
    onClose: () => void;
    labelCode: string;
    imagesData: LabelImagesDetail | null;
    isLoading: boolean;
    error: string | null;
}

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`image-tabpanel-${index}`}
            aria-labelledby={`image-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
        </div>
    );
}

function getStateIcon(state: string) {
    switch (state?.toUpperCase()) {
        case 'SUCCESS':
            return <SuccessIcon color="success" fontSize="small" />;
        case 'PROCESSING':
            return <ProcessingIcon color="warning" fontSize="small" />;
        case 'TIMEOUT':
            return <TimeoutIcon color="error" fontSize="small" />;
        default:
            return undefined;
    }
}

function getStateColor(state: string): 'success' | 'warning' | 'error' | 'default' {
    switch (state?.toUpperCase()) {
        case 'SUCCESS':
            return 'success';
        case 'PROCESSING':
            return 'warning';
        case 'TIMEOUT':
            return 'error';
        default:
            return 'default';
    }
}

function ImageGrid({ images }: { images: LabelImage[] }) {
    const { t } = useTranslation();

    if (!images || images.length === 0) {
        return (
            <Box sx={{ textAlign: 'center', py: 4 }}>
                <ImageIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                <Typography color="text.secondary">
                    {t('labels.images.noImages', 'No images available')}
                </Typography>
            </Box>
        );
    }

    return (
        <ImageList sx={{ width: '100%' }} cols={Math.min(images.length, 3)} gap={16}>
            {images.map((image) => (
                <ImageListItem key={image.index}>
                    <Box
                        sx={{
                            position: 'relative',
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                            overflow: 'hidden',
                            bgcolor: 'grey.100',
                        }}
                    >
                        <img
                            src={image.content}
                            alt={t('labels.images.altPage', 'Page {{index}}', { index: image.index })}
                            loading="lazy"
                            style={{
                                width: '100%',
                                height: 'auto',
                                maxHeight: 300,
                                objectFit: 'contain',
                                display: 'block',
                            }}
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                            }}
                        />
                    </Box>
                    <ImageListItemBar
                        title={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2">
                                    {t('labels.images.page', 'Page')} {image.index}
                                </Typography>
                                <Chip
                                    icon={getStateIcon(image.state)}
                                    label={image.state}
                                    size="small"
                                    color={getStateColor(image.state)}
                                    variant="outlined"
                                    sx={{ p: 1, px: 2 }}
                                />
                            </Box>
                        }
                        subtitle={
                            <Typography variant="caption" color="text.secondary">
                                {image.processUpdateTime}
                            </Typography>
                        }
                        position="below"
                    />
                </ImageListItem>
            ))}
        </ImageList>
    );
}

export function LabelImagesDialog({
    open,
    onClose,
    labelCode,
    imagesData,
    isLoading,
    error,
}: LabelImagesDialogProps) {
    const { t } = useTranslation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [tabValue, setTabValue] = useState(0);

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth fullScreen={isMobile}>
            <DialogTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <ImageIcon />
                    <Typography variant="h6">
                        {t('labels.images.title', 'Label Images')}
                    </Typography>
                    <Chip label={labelCode} variant="outlined" size="small" sx={{ fontFamily: 'monospace', p: 1, px: 2 }} />
                </Box>
            </DialogTitle>
            <DialogContent dividers>
                {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : error ? (
                    <Alert severity="error">{error}</Alert>
                ) : !imagesData ? (
                    <Alert severity="info">
                        {t('labels.images.noData', 'No image data available for this label')}
                    </Alert>
                ) : (
                    <>
                        {/* Label Info */}
                        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                            <Chip
                                label={`${imagesData.width} × ${imagesData.height} px`}
                                size="small"
                                variant="outlined"
                                sx={{ p: 1, px: 2 }}
                            />
                            <Chip
                                label={`${t('labels.images.activePage', 'Active Page')}: ${imagesData.activePage}`}
                                size="small"
                                color="primary"
                                variant="outlined"
                                sx={{ p: 1, px: 2 }}
                            />
                            {imagesData.isDualSidedLabel && (
                                <Chip
                                    label={t('labels.images.dualSided', 'Dual-Sided')}
                                    size="small"
                                    color="secondary"
                                    variant="outlined"
                                    sx={{ p: 1, px: 2 }}
                                />
                            )}
                        </Box>

                        {/* Tabs for Current/Previous Images */}
                        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                            <Tabs value={tabValue} onChange={handleTabChange}>
                                <Tab
                                    label={
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            {t('labels.images.current', 'Current Images')}
                                            <Chip
                                                label={imagesData.currentImage?.length || 0}
                                                size="small"
                                                color="primary"
                                            />
                                        </Box>
                                    }
                                />
                                <Tab
                                    label={
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            {t('labels.images.previous', 'Previous Images')}
                                            <Chip
                                                label={imagesData.previousImage?.length || 0}
                                                size="small"
                                            />
                                        </Box>
                                    }
                                />
                            </Tabs>
                        </Box>

                        <TabPanel value={tabValue} index={0}>
                            <ImageGrid images={imagesData.currentImage} />
                        </TabPanel>
                        <TabPanel value={tabValue} index={1}>
                            <ImageGrid images={imagesData.previousImage} />
                        </TabPanel>
                    </>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{t('common.close', 'Close')}</Button>
            </DialogActions>
        </Dialog>
    );
}
