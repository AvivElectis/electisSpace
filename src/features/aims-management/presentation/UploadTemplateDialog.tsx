/**
 * Upload Template Dialog
 *
 * Form for uploading a new template with XSL + JSON files.
 * Uses React Hook Form + Zod for validation.
 * Validates template name uniqueness against existing templates.
 */

import { useRef, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button,
    TextField, Box, IconButton, Typography, Stack,
    CircularProgress, Autocomplete, useMediaQuery, useTheme,
} from '@mui/material';
import Close from '@mui/icons-material/Close';
import UploadFileIcon from '@mui/icons-material/UploadFile';

const uploadFormSchema = z.object({
    templateName: z.string().min(1),
    labelType: z.string().min(1),
    width: z.string().min(1),
    height: z.string().min(1),
});

type UploadFormValues = z.infer<typeof uploadFormSchema>;

interface TemplateType {
    typeName: string;
    templateSize?: string;
    width: string | number;
    height: string | number;
}

interface UploadTemplateDialogProps {
    open: boolean;
    onClose: () => void;
    templateTypes: TemplateType[];
    existingTemplateNames: string[];
    onUpload: (templateData: Record<string, any>) => Promise<void>;
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

export function UploadTemplateDialog({ open, onClose, templateTypes, existingTemplateNames, onUpload }: UploadTemplateDialogProps) {
    const { t } = useTranslation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [xslFile, setXslFile] = useState<File | null>(null);
    const [jsonFile, setJsonFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [fileError, setFileError] = useState<string | null>(null);

    const xslInputRef = useRef<HTMLInputElement>(null);
    const jsonInputRef = useRef<HTMLInputElement>(null);

    const existingNamesSet = useMemo(
        () => new Set(existingTemplateNames.map(n => n.toLowerCase())),
        [existingTemplateNames],
    );

    const { control, handleSubmit, setValue, reset, formState: { errors }, setError, clearErrors } = useForm<UploadFormValues>({
        resolver: zodResolver(uploadFormSchema),
        defaultValues: {
            templateName: '',
            labelType: '',
            width: '',
            height: '',
        },
    });

    const handleSizeChange = (_: any, value: TemplateType | null) => {
        if (value) {
            setValue('labelType', value.typeName, { shouldValidate: true });
            setValue('width', String(value.width), { shouldValidate: true });
            setValue('height', String(value.height), { shouldValidate: true });
        }
    };

    const validateTemplateName = (name: string): boolean => {
        if (existingNamesSet.has(name.toLowerCase())) {
            setError('templateName', { type: 'manual', message: t('aims.duplicateTemplateName') });
            return false;
        }
        clearErrors('templateName');
        return true;
    };

    const onSubmit = async (values: UploadFormValues) => {
        if (!validateTemplateName(values.templateName)) return;
        if (!xslFile || !jsonFile) {
            setFileError(t('aims.bothFilesRequired'));
            return;
        }
        setFileError(null);
        setSubmitting(true);
        try {
            const [xslBase64, jsonBase64] = await Promise.all([
                fileToBase64(xslFile),
                fileToBase64(jsonFile),
            ]);

            await onUpload({
                data: xslBase64,
                jsonData: jsonBase64,
                templateName: values.templateName,
                labelType: values.labelType,
                fileType: '.dat',
                width: values.width,
                height: values.height,
                tagImageUpdateRequired: false,
                templateModel: '',
                templateModelSize: '',
                color: 'BW',
                dithering: false,
            });

            handleClose();
        } catch {
            // error handled by caller
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        reset();
        setXslFile(null);
        setJsonFile(null);
        setFileError(null);
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth fullScreen={isMobile}>
            <DialogTitle>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6">{t('aims.uploadTemplate')}</Typography>
                    <IconButton onClick={handleClose} size="small"><Close /></IconButton>
                </Box>
            </DialogTitle>
            <DialogContent dividers>
                <Stack gap={2.5} sx={{ mt: 1 }}>
                    {/* Template Name */}
                    <Controller
                        name="templateName"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                label={t('aims.templateName')}
                                required
                                fullWidth
                                error={!!errors.templateName}
                                helperText={errors.templateName?.message || (errors.templateName ? t('aims.templateNameRequired') : undefined)}
                                onBlur={(e) => {
                                    field.onBlur();
                                    if (e.target.value) validateTemplateName(e.target.value);
                                }}
                            />
                        )}
                    />

                    {/* Size (Autocomplete from templateTypes) */}
                    <Autocomplete
                        options={templateTypes}
                        getOptionLabel={(opt) => `${opt.typeName} (${opt.width} x ${opt.height})`}
                        onChange={handleSizeChange}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label={t('aims.selectSize')}
                                required
                                error={!!errors.labelType}
                                helperText={errors.labelType ? t('aims.sizeRequired') : undefined}
                            />
                        )}
                        fullWidth
                    />

                    {/* XSL + JSON files side by side on desktop/tablet */}
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
                                onChange={(e) => {
                                    setXslFile(e.target.files?.[0] ?? null);
                                    setFileError(null);
                                }}
                            />
                            <Button
                                variant="outlined"
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
                                onChange={(e) => {
                                    setJsonFile(e.target.files?.[0] ?? null);
                                    setFileError(null);
                                }}
                            />
                            <Button
                                variant="outlined"
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
                        <Typography color="error" variant="body2">{fileError}</Typography>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} disabled={submitting}>{t('common.cancel')}</Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit(onSubmit)}
                    disabled={submitting}
                    startIcon={submitting ? <CircularProgress size={16} /> : undefined}
                >
                    {t('aims.uploadTemplate')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
