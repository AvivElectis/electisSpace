import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  TextField,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Chip,
  InputAdornment,
  Fade,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DashboardIcon from '@mui/icons-material/Dashboard';
import BusinessIcon from '@mui/icons-material/Business';
import PeopleIcon from '@mui/icons-material/People';
import LabelIcon from '@mui/icons-material/Label';
import SettingsIcon from '@mui/icons-material/Settings';
import HistoryIcon from '@mui/icons-material/History';
import KeyboardReturnIcon from '@mui/icons-material/KeyboardReturn';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '@features/auth/application/useAuthContext';
import { ConferenceIcon } from '../../../components/icons/ConferenceIcon';

export interface CommandAction {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactElement;
  category: 'navigation' | 'search' | 'action' | 'recent';
  keywords?: string[];
  onExecute: () => void;
  adminOnly?: boolean;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onSettingsClick?: () => void;
}

/**
 * Command Palette — Ctrl+K quick actions dialog
 * Provides instant navigation, search, and actions.
 */
export function CommandPalette({ open, onClose, onSettingsClick }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { canAccessFeature } = useAuthContext();

  const isAdmin = canAccessFeature('settings' as any);

  const actions: CommandAction[] = useMemo(() => {
    const nav: CommandAction[] = [
      {
        id: 'nav-dashboard',
        label: t('navigation.dashboard', 'Dashboard'),
        description: t('quickActions.goToDashboard', 'Go to dashboard overview'),
        icon: <DashboardIcon />,
        category: 'navigation',
        keywords: ['home', 'overview', 'main'],
        onExecute: () => navigate('/'),
      },
      {
        id: 'nav-spaces',
        label: t('navigation.spaces', 'Spaces'),
        description: t('quickActions.goToSpaces', 'Manage spaces and rooms'),
        icon: <BusinessIcon />,
        category: 'navigation',
        keywords: ['rooms', 'desks', 'chairs'],
        onExecute: () => navigate('/spaces'),
      },
      {
        id: 'nav-people',
        label: t('navigation.people', 'People'),
        description: t('quickActions.goToPeople', 'Manage people assignments'),
        icon: <PeopleIcon />,
        category: 'navigation',
        keywords: ['persons', 'employees', 'staff'],
        onExecute: () => navigate('/people'),
      },
      {
        id: 'nav-conference',
        label: t('navigation.conference', 'Conference'),
        description: t('quickActions.goToConference', 'Conference room management'),
        icon: <ConferenceIcon />,
        category: 'navigation',
        keywords: ['meeting', 'rooms', 'booking'],
        onExecute: () => navigate('/conference'),
      },
      {
        id: 'nav-labels',
        label: t('navigation.labels', 'Labels'),
        description: t('quickActions.goToLabels', 'View and manage ESL labels'),
        icon: <LabelIcon />,
        category: 'navigation',
        keywords: ['esl', 'shelf', 'electronic'],
        onExecute: () => navigate('/labels'),
      },
    ];

    if (isAdmin && onSettingsClick) {
      nav.push({
        id: 'action-settings',
        label: t('navigation.settings', 'Settings'),
        description: t('quickActions.openSettings', 'Open application settings'),
        icon: <SettingsIcon />,
        category: 'action',
        keywords: ['config', 'preferences', 'admin'],
        onExecute: () => onSettingsClick(),
        adminOnly: true,
      });
    }

    if (isAdmin) {
      nav.push({
        id: 'nav-audit',
        label: t('quickActions.auditLog', 'Audit Log'),
        description: t('quickActions.viewAuditLog', 'View system activity log'),
        icon: <HistoryIcon />,
        category: 'action',
        keywords: ['activity', 'log', 'history', 'trail'],
        onExecute: () => navigate('/audit-log'),
        adminOnly: true,
      });
    }

    return nav;
  }, [navigate, t, isAdmin, onSettingsClick]);

  const filtered = useMemo(() => {
    if (!query.trim()) return actions;
    const q = query.toLowerCase();
    return actions.filter(a => {
      const searchable = [a.label, a.description, ...(a.keywords || [])].join(' ').toLowerCase();
      return searchable.includes(q);
    });
  }, [query, actions]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Clamp selected index
  useEffect(() => {
    setSelectedIndex(i => Math.min(i, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  const executeAction = useCallback((action: CommandAction) => {
    onClose();
    // Small delay so dialog closes before navigation
    setTimeout(() => action.onExecute(), 50);
  }, [onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filtered[selectedIndex]) executeAction(filtered[selectedIndex]);
        break;
      case 'Escape':
        onClose();
        break;
    }
  }, [filtered, selectedIndex, executeAction, onClose]);

  const categoryLabel = (cat: string) => {
    switch (cat) {
      case 'navigation': return t('quickActions.categoryNav', 'Navigation');
      case 'action': return t('quickActions.categoryAction', 'Actions');
      case 'search': return t('quickActions.categorySearch', 'Search');
      case 'recent': return t('quickActions.categoryRecent', 'Recent');
      default: return cat;
    }
  };

  // Group by category
  const grouped = useMemo(() => {
    const groups: Record<string, CommandAction[]> = {};
    for (const a of filtered) {
      (groups[a.category] ||= []).push(a);
    }
    return groups;
  }, [filtered]);

  let flatIndex = 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      TransitionComponent={Fade}
      transitionDuration={150}
      PaperProps={{
        sx: {
          position: 'fixed',
          top: '15%',
          m: 0,
          borderRadius: 2,
          maxHeight: '60vh',
        },
      }}
      slotProps={{ backdrop: { sx: { backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)' } } }}
    >
      <DialogContent sx={{ p: 0 }}>
        <TextField
          inputRef={inputRef}
          fullWidth
          placeholder={t('quickActions.placeholder', 'Type a command or search...')}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          variant="outlined"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <Chip label="ESC" size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />
              </InputAdornment>
            ),
            sx: { fontSize: '1rem' },
          }}
          sx={{ '& .MuiOutlinedInput-notchedOutline': { border: 'none' }, borderBottom: 1, borderColor: 'divider' }}
        />
        <List dense sx={{ maxHeight: '45vh', overflow: 'auto', py: 0.5 }}>
          {filtered.length === 0 && (
            <Box sx={{ py: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                {t('quickActions.noResults', 'No results found')}
              </Typography>
            </Box>
          )}
          {Object.entries(grouped).map(([category, items]) => (
            <Box key={category}>
              <Typography
                variant="overline"
                sx={{ px: 2, py: 0.5, display: 'block', color: 'text.secondary', fontSize: '0.65rem' }}
              >
                {categoryLabel(category)}
              </Typography>
              {items.map(action => {
                const idx = flatIndex++;
                return (
                  <ListItemButton
                    key={action.id}
                    selected={idx === selectedIndex}
                    onClick={() => executeAction(action)}
                    sx={{
                      mx: 1,
                      borderRadius: 1,
                      '&.Mui-selected': { bgcolor: 'action.selected' },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36, color: idx === selectedIndex ? 'primary.main' : 'action.active' }}>
                      {action.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={action.label}
                      secondary={action.description}
                      primaryTypographyProps={{ variant: 'body2', fontWeight: idx === selectedIndex ? 600 : 400 }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                    {idx === selectedIndex && (
                      <KeyboardReturnIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    )}
                  </ListItemButton>
                );
              })}
            </Box>
          ))}
        </List>
        <Box sx={{ display: 'flex', gap: 2, px: 2, py: 1, borderTop: 1, borderColor: 'divider', justifyContent: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            ↑↓ navigate · ↵ select · esc close
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
