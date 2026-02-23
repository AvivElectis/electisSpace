import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Stack,
    MenuItem,
    FormControl,
    InputLabel,
    Select,
    Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { RewardsCampaign, CreateCampaignInput, DiscountType } from '../domain/types';
import { TEMPLATE_OPTIONS } from '../domain/types';

interface CampaignDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (data: CreateCampaignInput) => Promise<void>;
    campaign?: RewardsCampaign | null;
    storeId: string;
}

export function CampaignDialog({ open, onClose, onSave, campaign, storeId }: CampaignDialogProps) {
    const { t, i18n } = useTranslation();
    const isHebrew = i18n.language === 'he';
    const isEdit = !!campaign;
    
    const [name, setName] = useState('');
    const [nameHe, setNameHe] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [templateKey, setTemplateKey] = useState('');
    const [discountType, setDiscountType] = useState<DiscountType | ''>('');
    const [discountValue, setDiscountValue] = useState('');
    const [labelCodesStr, setLabelCodesStr] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (campaign) {
            setName(campaign.name);
            setNameHe(campaign.nameHe || '');
            setDescription(campaign.description || '');
            setStartDate(campaign.startDate ? campaign.startDate.slice(0, 16) : '');
            setEndDate(campaign.endDate ? campaign.endDate.slice(0, 16) : '');
            setTemplateKey(campaign.templateKey || '');
            setDiscountType(campaign.discountType || '');
            setDiscountValue(campaign.discountValue?.toString() || '');
            setLabelCodesStr(campaign.labelCodes.join(', '));
        } else {
            setName(''); setNameHe(''); setDescription('');
            setStartDate(''); setEndDate(''); setTemplateKey('');
            setDiscountType(''); setDiscountValue(''); setLabelCodesStr('');
        }
    }, [campaign, open]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const labelCodes = labelCodesStr
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);
            
            await onSave({
                storeId,
                name,
                nameHe: nameHe || undefined,
                description: description || undefined,
                startDate: startDate ? new Date(startDate).toISOString() : undefined,
                endDate: endDate ? new Date(endDate).toISOString() : undefined,
                templateKey: templateKey || undefined,
                discountType: (discountType as DiscountType) || undefined,
                discountValue: discountValue ? parseFloat(discountValue) : undefined,
                labelCodes,
            });
            onClose();
        } catch {
            // Error handled by store
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                {isEdit ? t('rewards.editCampaign') : t('rewards.createCampaign')}
            </DialogTitle>
            <DialogContent>
                <Stack spacing={2} mt={1}>
                    <TextField
                        label={t('rewards.campaignName')}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        fullWidth
                        required
                    />
                    <TextField
                        label={t('rewards.campaignNameHe')}
                        value={nameHe}
                        onChange={(e) => setNameHe(e.target.value)}
                        fullWidth
                        dir="rtl"
                        placeholder="שם הקמפיין בעברית"
                    />
                    <TextField
                        label={t('rewards.description')}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        fullWidth
                        multiline
                        rows={2}
                    />
                    <Stack direction="row" spacing={2}>
                        <TextField
                            label={t('rewards.startDate')}
                            type="datetime-local"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            fullWidth
                            slotProps={{ inputLabel: { shrink: true } }}
                        />
                        <TextField
                            label={t('rewards.endDate')}
                            type="datetime-local"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            fullWidth
                            slotProps={{ inputLabel: { shrink: true } }}
                        />
                    </Stack>
                    <FormControl fullWidth>
                        <InputLabel>{t('rewards.template')}</InputLabel>
                        <Select
                            value={templateKey}
                            label={t('rewards.template')}
                            onChange={(e) => setTemplateKey(e.target.value)}
                        >
                            <MenuItem value="">
                                <em>{t('common.none')}</em>
                            </MenuItem>
                            {TEMPLATE_OPTIONS.map((opt) => (
                                <MenuItem key={opt.key} value={opt.key}>
                                    {isHebrew ? opt.labelHe : opt.labelEn}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Stack direction="row" spacing={2}>
                        <FormControl fullWidth>
                            <InputLabel>{t('rewards.discountType.label')}</InputLabel>
                            <Select
                                value={discountType}
                                label={t('rewards.discountType.label')}
                                onChange={(e) => setDiscountType(e.target.value as DiscountType | '')}
                            >
                                <MenuItem value=""><em>{t('common.none')}</em></MenuItem>
                                <MenuItem value="PERCENTAGE">{t('rewards.discountType.PERCENTAGE')}</MenuItem>
                                <MenuItem value="FIXED_AMOUNT">{t('rewards.discountType.FIXED_AMOUNT')}</MenuItem>
                                <MenuItem value="BUY_X_GET_Y">{t('rewards.discountType.BUY_X_GET_Y')}</MenuItem>
                                <MenuItem value="LOYALTY_POINTS">{t('rewards.discountType.LOYALTY_POINTS')}</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField
                            label={t('rewards.discountValue')}
                            type="number"
                            value={discountValue}
                            onChange={(e) => setDiscountValue(e.target.value)}
                            fullWidth
                        />
                    </Stack>
                    <TextField
                        label={t('rewards.labelCodes')}
                        value={labelCodesStr}
                        onChange={(e) => setLabelCodesStr(e.target.value)}
                        fullWidth
                        helperText={t('rewards.labelCodesHelp')}
                        placeholder="ESL001, ESL002, ESL003"
                    />
                    <Typography variant="caption" color="text.secondary">
                        {t('rewards.priorityHelp')}
                    </Typography>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{t('common.cancel')}</Button>
                <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={!name || saving}
                >
                    {saving ? t('common.saving') : t('common.save')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
