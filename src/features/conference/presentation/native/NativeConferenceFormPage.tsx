import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Box, Typography, Stack, FormControlLabel, Switch, Chip } from '@mui/material';

import { useConferenceController } from '@features/conference/application/useConferenceController';
import { useConferenceStore } from '@features/conference/infrastructure/conferenceStore';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';
import { useBackendSyncContext } from '@features/sync/application/SyncContext';

import { NativeFormPage } from '@shared/presentation/native/NativeFormPage';
import { NativeFormSection } from '@shared/presentation/native/NativeFormSection';
import { NativeTextField } from '@shared/presentation/native/NativeTextField';
import { NativeDeleteButton } from '@shared/presentation/native/NativeDeleteButton';
import { nativeSpacing } from '@shared/presentation/themes/nativeTokens';

/**
 * NativeConferenceFormPage — Android-native create / edit conference room form.
 * - Create mode: no `id` param → /conference/new
 * - Edit mode: `id` param → /conference/:id/edit
 *
 * Mirrors field logic from ConferenceRoomDialog.
 */
export function NativeConferenceFormPage() {
    const { id } = useParams<{ id: string }>();
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const isRtl = i18n.dir() === 'rtl';

    const isEditMode = !!id;

    const settings = useSettingsStore((state) => state.settings);
    const rooms = useConferenceStore((state) => state.conferenceRooms);
    const solumToken = settings.solumConfig?.tokens?.accessToken;
    const { push } = useBackendSyncContext();

    const conferenceController = useConferenceController({
        onSync: settings.workingMode === 'SOLUM_API' ? async () => { await push(); } : undefined,
        solumConfig: settings.solumConfig,
        solumToken,
        solumMappingConfig: settings.solumMappingConfig,
    });

    const existingRoom = useMemo(
        () => (id ? rooms.find((r) => r.id === id) : undefined),
        [id, rooms]
    );

    // ── Form state ──────────────────────────────────────────────────────────────
    const [roomId, setRoomId] = useState('');
    const [idError, setIdError] = useState('');
    const [roomName, setRoomName] = useState('');
    const [hasMeeting, setHasMeeting] = useState(false);
    const [meetingName, setMeetingName] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [participantsText, setParticipantsText] = useState('');
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Initialize form
    useEffect(() => {
        if (existingRoom) {
            setRoomId(existingRoom.id);
            setRoomName(existingRoom.roomName || existingRoom.data?.roomName || '');
            setHasMeeting(existingRoom.hasMeeting);
            setMeetingName(existingRoom.meetingName || '');
            setStartTime(existingRoom.startTime || '');
            setEndTime(existingRoom.endTime || '');
            setParticipantsText((existingRoom.participants || []).join(', '));
        } else {
            setRoomId('');
            setIdError('');
            setRoomName('');
            setHasMeeting(false);
            setMeetingName('');
            setStartTime('');
            setEndTime('');
            setParticipantsText('');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [existingRoom?.id]);

    const handleIdChange = (value: string) => {
        // Allow only numbers (mirrors ConferenceRoomDialog)
        const numericValue = value.replace(/[^0-9]/g, '').trim();
        setRoomId(numericValue);
        const existingIds = rooms.map((r) => r.id);
        if (existingIds.includes(numericValue) && (!existingRoom || existingRoom.id !== numericValue)) {
            setIdError(t('errors.idExists'));
        } else {
            setIdError('');
        }
    };

    const handleSave = async () => {
        if (!isEditMode && !roomId.trim()) {
            setIdError(t('validation.required', { field: t('conference.roomId') }));
            return;
        }
        setSaving(true);
        try {
            const participants = participantsText
                .split(',')
                .map((p) => p.trim())
                .filter((p) => p.length > 0);

            // Normalize ID (strip C prefix, pad to 2 digits — mirrors ConferenceRoomDialog)
            let finalId = existingRoom ? existingRoom.id : roomId.trim();
            if (finalId.startsWith('C') || finalId.startsWith('c')) {
                finalId = finalId.substring(1);
            }
            if (finalId.length === 1) {
                finalId = '0' + finalId;
            }

            const roomData = {
                id: finalId,
                roomName,
                hasMeeting,
                meetingName: hasMeeting ? meetingName : '',
                startTime: hasMeeting ? startTime : '',
                endTime: hasMeeting ? endTime : '',
                participants: hasMeeting ? participants : [],
                data: {
                    ...(existingRoom?.data || {}),
                    roomName,
                },
            };

            if (isEditMode && existingRoom) {
                await conferenceController.updateConferenceRoom(existingRoom.id, roomData);
            } else {
                await conferenceController.addConferenceRoom(roomData);
            }
            navigate(-1);
        } catch {
            // Error surfaced via store
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!id || !existingRoom) return;
        setDeleting(true);
        try {
            await conferenceController.deleteConferenceRoom(id);
            navigate(-1);
        } finally {
            setDeleting(false);
        }
    };

    const pageTitle = isEditMode ? t('conference.editRoom') : t('conference.addRoom');

    // Participants preview
    const participantList = participantsText
        .split(',')
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

    return (
        <NativeFormPage title={pageTitle} onSave={handleSave} isSaving={saving}>
            {/* Room Details */}
            <NativeFormSection title={t('conference.native.roomDetails', 'Room Details')}>
                {/* Room ID */}
                <NativeTextField
                    label={t('conference.roomId')}
                    value={roomId}
                    onChange={(e) => handleIdChange(e.target.value)}
                    disabled={isEditMode}
                    autoFocus={!isEditMode}
                    helperText={
                        idError ||
                        (isEditMode
                            ? t('conference.idCannotChange', 'ID cannot be changed')
                            : t('conference.idAutoFormat', 'Numeric ID (e.g., 01, 02)'))
                    }
                    error={!!idError}
                />

                {/* Room Name */}
                <NativeTextField
                    label={t('conference.roomName')}
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder={t('conference.roomNamePlaceholder', 'e.g., Board Room A')}
                />
            </NativeFormSection>

            {/* Meeting Info */}
            <NativeFormSection title={t('conference.meetingInfo')}>
                <FormControlLabel
                    control={
                        <Switch
                            checked={hasMeeting}
                            onChange={(e) => setHasMeeting(e.target.checked)}
                        />
                    }
                    label={t('conference.native.hasActiveMeeting', 'Has Active Meeting')}
                    sx={{ mb: 1 }}
                />

                {hasMeeting && (
                    <>
                        <NativeTextField
                            label={t('conference.meetingName')}
                            value={meetingName}
                            onChange={(e) => setMeetingName(e.target.value)}
                            dir={isRtl ? 'rtl' : 'ltr'}
                        />
                        <Stack direction="row" gap={1}>
                            <NativeTextField
                                label={t('conference.startTime')}
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                type="time"
                            />
                            <NativeTextField
                                label={t('conference.endTime')}
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                type="time"
                            />
                        </Stack>
                    </>
                )}
            </NativeFormSection>

            {/* Participants (only if has meeting) */}
            {hasMeeting && (
                <NativeFormSection title={t('conference.participants')}>
                    <NativeTextField
                        label={t('conference.participants')}
                        value={participantsText}
                        onChange={(e) => setParticipantsText(e.target.value)}
                        helperText={t('conference.participantsHelper')}
                        multiline
                        rows={2}
                        dir={isRtl ? 'rtl' : 'ltr'}
                    />
                    {participantList.length > 0 && (
                        <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                                {t('conference.preview')}
                            </Typography>
                            <Stack direction="row" flexWrap="wrap" gap={0.5}>
                                {participantList.map((p, idx) => (
                                    <Chip key={idx} label={p} size="small" variant="outlined" />
                                ))}
                            </Stack>
                        </Box>
                    )}
                </NativeFormSection>
            )}

            {/* Delete button (edit mode only) */}
            {isEditMode && (
                <Box sx={{ px: `${nativeSpacing.pagePadding}px`, pb: 4 }}>
                    <NativeDeleteButton
                        onDelete={handleDelete}
                        isDeleting={deleting}
                        itemName={existingRoom?.roomName || existingRoom?.id}
                        label={t('conference.deleteRoom')}
                    />
                </Box>
            )}
        </NativeFormPage>
    );
}
