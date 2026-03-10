import { useEffect, useRef, useState } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    ListItemSecondaryAction,
    Avatar,
    IconButton,
    TextField,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Chip,
    Alert,
    CircularProgress,
    Divider,
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useFriendsStore } from '../application/useFriendsStore';

export function FriendsPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const {
        friends,
        pendingRequests,
        isLoading,
        error,
        fetchFriends,
        fetchPendingRequests,
        sendRequest,
        acceptRequest,
        declineRequest,
        removeFriend,
        clearError,
    } = useFriendsStore();

    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [addEmail, setAddEmail] = useState('');
    const [addSuccess, setAddSuccess] = useState(false);
    const [loadingActionId, setLoadingActionId] = useState<string | null>(null);
    const [sendingRequest, setSendingRequest] = useState(false);
    const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
    const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        fetchFriends();
        fetchPendingRequests();
        return () => {
            if (successTimerRef.current) clearTimeout(successTimerRef.current);
        };
    }, [fetchFriends, fetchPendingRequests]);

    const handleSendRequest = async () => {
        setSendingRequest(true);
        const ok = await sendRequest(addEmail);
        setSendingRequest(false);
        if (ok) {
            setAddEmail('');
            setAddSuccess(true);
            successTimerRef.current = setTimeout(() => {
                setAddDialogOpen(false);
                setAddSuccess(false);
            }, 1500);
        }
    };

    const handleAccept = async (id: string) => {
        setLoadingActionId(id);
        await acceptRequest(id);
        setLoadingActionId(null);
    };

    const handleDecline = async (id: string) => {
        setLoadingActionId(id);
        await declineRequest(id);
        setLoadingActionId(null);
    };

    const handleRemoveConfirm = async () => {
        if (!confirmRemoveId) return;
        setLoadingActionId(confirmRemoveId);
        await removeFriend(confirmRemoveId);
        setLoadingActionId(null);
        setConfirmRemoveId(null);
    };

    const checkedInFriends = friends.filter((f) => f.checkedInSpace);
    const otherFriends = friends.filter((f) => !f.checkedInSpace);

    return (
        <Box sx={{ p: 2, pb: 10 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <IconButton onClick={() => navigate('/profile')} edge="start">
                    <ArrowBackIcon />
                </IconButton>
                <Typography variant="h5" fontWeight={700} sx={{ flex: 1 }}>
                    {t('friends.title')}
                </Typography>
                <IconButton color="primary" onClick={() => setAddDialogOpen(true)}>
                    <PersonAddIcon />
                </IconButton>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={clearError}>
                    {error}
                </Alert>
            )}

            {isLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                </Box>
            )}

            {/* Pending requests */}
            {pendingRequests.length > 0 && (
                <Card variant="outlined" sx={{ mb: 2 }}>
                    <CardContent>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                            {t('friends.pendingRequests')} ({pendingRequests.length})
                        </Typography>
                        <List disablePadding>
                            {pendingRequests.map((req) => (
                                <ListItem key={req.id} disablePadding sx={{ py: 0.5 }}>
                                    <ListItemAvatar>
                                        <Avatar sx={{ width: 36, height: 36, bgcolor: 'secondary.main' }}>
                                            {req.requester.displayName.charAt(0)}
                                        </Avatar>
                                    </ListItemAvatar>
                                    <ListItemText
                                        primary={req.requester.displayName}
                                        secondary={req.requester.email}
                                        primaryTypographyProps={{ variant: 'body2' }}
                                        secondaryTypographyProps={{ variant: 'caption' }}
                                    />
                                    <ListItemSecondaryAction>
                                        <IconButton
                                            size="small"
                                            color="success"
                                            disabled={loadingActionId === req.id}
                                            onClick={() => handleAccept(req.id)}
                                        >
                                            {loadingActionId === req.id ? <CircularProgress size={18} /> : <CheckIcon />}
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            color="error"
                                            disabled={loadingActionId === req.id}
                                            onClick={() => handleDecline(req.id)}
                                        >
                                            <CloseIcon />
                                        </IconButton>
                                    </ListItemSecondaryAction>
                                </ListItem>
                            ))}
                        </List>
                    </CardContent>
                </Card>
            )}

            {/* Checked-in friends */}
            {checkedInFriends.length > 0 && (
                <Card variant="outlined" sx={{ mb: 2 }}>
                    <CardContent>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                            {t('friends.checkedIn')} ({checkedInFriends.length})
                        </Typography>
                        <List disablePadding>
                            {checkedInFriends.map((friend, i) => (
                                <Box key={friend.id}>
                                    {i > 0 && <Divider />}
                                    <ListItem disablePadding sx={{ py: 0.5 }}>
                                        <ListItemAvatar>
                                            <Avatar
                                                src={friend.avatarUrl ?? undefined}
                                                sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}
                                            >
                                                {friend.displayName.charAt(0)}
                                            </Avatar>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={friend.displayName}
                                            secondary={
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <LocationOnIcon sx={{ fontSize: 14 }} />
                                                    {friend.checkedInSpace?.displayName}
                                                    {friend.checkedInSpace?.floorName && (
                                                        <> · {friend.checkedInSpace.floorName}</>
                                                    )}
                                                </Box>
                                            }
                                            primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                                        />
                                        <Chip
                                            size="small"
                                            label={t('friends.here')}
                                            color="success"
                                            variant="outlined"
                                        />
                                    </ListItem>
                                </Box>
                            ))}
                        </List>
                    </CardContent>
                </Card>
            )}

            {/* All friends */}
            {otherFriends.length > 0 && (
                <Card variant="outlined">
                    <CardContent>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                            {t('friends.allFriends')} ({friends.length})
                        </Typography>
                        <List disablePadding>
                            {otherFriends.map((friend, i) => (
                                <Box key={friend.id}>
                                    {i > 0 && <Divider />}
                                    <ListItem disablePadding sx={{ py: 0.5 }}>
                                        <ListItemAvatar>
                                            <Avatar
                                                src={friend.avatarUrl ?? undefined}
                                                sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}
                                            >
                                                {friend.displayName.charAt(0)}
                                            </Avatar>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={friend.displayName}
                                            secondary={friend.email}
                                            primaryTypographyProps={{ variant: 'body2' }}
                                            secondaryTypographyProps={{ variant: 'caption' }}
                                        />
                                        <ListItemSecondaryAction>
                                            <IconButton
                                                size="small"
                                                color="error"
                                                disabled={loadingActionId === friend.friendshipId}
                                                onClick={() => setConfirmRemoveId(friend.friendshipId)}
                                            >
                                                {loadingActionId === friend.friendshipId ? <CircularProgress size={18} /> : <PersonRemoveIcon fontSize="small" />}
                                            </IconButton>
                                        </ListItemSecondaryAction>
                                    </ListItem>
                                </Box>
                            ))}
                        </List>
                    </CardContent>
                </Card>
            )}

            {!isLoading && friends.length === 0 && pendingRequests.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                        {t('friends.noFriends')}
                    </Typography>
                    <Button
                        variant="outlined"
                        startIcon={<PersonAddIcon />}
                        sx={{ mt: 2 }}
                        onClick={() => setAddDialogOpen(true)}
                    >
                        {t('friends.addFriend')}
                    </Button>
                </Box>
            )}

            {/* Remove friend confirmation dialog */}
            <Dialog open={!!confirmRemoveId} onClose={() => setConfirmRemoveId(null)}>
                <DialogTitle>{t('friends.removeFriendTitle')}</DialogTitle>
                <DialogContent>
                    <Typography>{t('friends.removeFriendConfirm')}</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmRemoveId(null)} color="inherit">
                        {t('booking.no')}
                    </Button>
                    <Button variant="contained" color="error" onClick={handleRemoveConfirm}>
                        {t('friends.removeFriend')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Add friend dialog */}
            <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>{t('friends.addFriend')}</DialogTitle>
                <DialogContent>
                    {addSuccess ? (
                        <Alert severity="success" sx={{ mt: 1 }}>
                            {t('friends.requestSent')}
                        </Alert>
                    ) : (
                        <>
                            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                            <TextField
                                label={t('friends.emailLabel')}
                                fullWidth
                                value={addEmail}
                                onChange={(e) => setAddEmail(e.target.value)}
                                placeholder="colleague@company.com"
                                type="email"
                                sx={{ mt: 1 }}
                            />
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAddDialogOpen(false)} color="inherit">
                        {t('booking.cancel')}
                    </Button>
                    {!addSuccess && (
                        <Button
                            variant="contained"
                            onClick={handleSendRequest}
                            disabled={!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addEmail) || sendingRequest}
                            startIcon={sendingRequest ? <CircularProgress size={16} /> : undefined}
                        >
                            {t('friends.sendRequest')}
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        </Box>
    );
}
