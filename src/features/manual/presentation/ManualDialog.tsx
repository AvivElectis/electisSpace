import {
    Dialog,
    DialogTitle,
    DialogContent,
    Box,
    IconButton,
    Tabs,
    Tab,
    Typography,
    Divider,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import BusinessIcon from '@mui/icons-material/Business';
import PeopleIcon from '@mui/icons-material/People';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import SyncIcon from '@mui/icons-material/Sync';
import SettingsIcon from '@mui/icons-material/Settings';
import { useState, type SyntheticEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { MANUAL_TABS, type ManualTab } from '../domain/types';
import { ManualSection } from './ManualSection';

interface ManualDialogProps {
    open: boolean;
    onClose: () => void;
}

// Icon mapping for dynamic icon rendering
const iconMap: Record<string, React.ReactElement> = {
    RocketLaunch: <RocketLaunchIcon />,
    Business: <BusinessIcon />,
    People: <PeopleIcon />,
    MeetingRoom: <MeetingRoomIcon />,
    Sync: <SyncIcon />,
    Settings: <SettingsIcon />,
};

/**
 * Tab Panel component for manual sections
 */
interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`manual-tabpanel-${index}`}
            aria-labelledby={`manual-tab-${index}`}
            style={{ height: '100%', overflow: 'auto' }}
        >
            {value === index && (
                <Box sx={{ py: 2, px: { xs: 1, sm: 2 } }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

/**
 * Manual Dialog Component
 * 
 * Provides in-app user manual with:
 * - Tab-based navigation for each feature area
 * - Bilingual support (English & Hebrew)
 * - RTL layout support
 * - Responsive design for mobile/desktop
 */
export function ManualDialog({ open, onClose }: ManualDialogProps) {
    const { t } = useTranslation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [currentTab, setCurrentTab] = useState(0);

    const handleTabChange = (_event: SyntheticEvent, newValue: number) => {
        setCurrentTab(newValue);
    };

    const renderTabContent = (tab: ManualTab) => (
        <Box>
            {/* Tab Header */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                    {t(tab.titleKey)}
                </Typography>
                <Divider />
            </Box>

            {/* Sections */}
            {tab.sections.map((section, index) => (
                <ManualSection
                    key={section.id}
                    section={section}
                    isLast={index === tab.sections.length - 1}
                />
            ))}
        </Box>
    );

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            fullScreen={isMobile}
            PaperProps={{
                sx: {
                    height: isMobile ? '100%' : '85vh',
                    maxHeight: isMobile ? '100%' : '900px',
                    borderRadius: isMobile ? 0 : undefined,
                }
            }}
        >
            <DialogTitle sx={{ pb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="h6" component="span">
                        {t('manual.title')}
                    </Typography>
                </Box>
                <IconButton
                    aria-label="close"
                    onClick={onClose}
                    sx={{
                        position: 'absolute',
                        insetInlineEnd: 8,
                        top: 8,
                    }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            {/* Tabs Navigation - styled like SettingsDialog */}
            <Box sx={{ px: { xs: 1, sm: 2 } }}>
                <Tabs
                    value={currentTab}
                    onChange={handleTabChange}
                    variant="scrollable"
                    scrollButtons="auto"
                    allowScrollButtonsMobile
                    sx={{
                        borderBottom: 0,
                        '& .MuiTab-root': {
                            border: '1px solid transparent',
                            borderRadius: 2,
                            minHeight: { xs: 48, sm: 56 },
                            fontSize: { xs: '0.75rem', sm: '0.875rem' },
                            px: { xs: 1, sm: 2 },
                            '&.Mui-selected': {
                                border: '1px solid',
                                borderColor: 'primary.main',
                                boxShadow: '2px 0 1px 1px rgba(68, 68, 68, 0.09)',
                            }
                        },
                    }}
                    TabIndicatorProps={{ sx: { display: 'none' } }}
                >
                    {MANUAL_TABS.map((tab, index) => (
                        <Tab
                            key={tab.id}
                            icon={iconMap[tab.iconName]}
                            iconPosition="start"
                            label={isMobile ? undefined : t(tab.titleKey)}
                            id={`manual-tab-${index}`}
                            aria-controls={`manual-tabpanel-${index}`}
                        />
                    ))}
                </Tabs>
            </Box>

            {/* Tab Content */}
            <DialogContent 
                sx={{ 
                    p: 0, 
                    flex: 1, 
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                <Box sx={{ flex: 1, overflow: 'auto' }}>
                    {MANUAL_TABS.map((tab, index) => (
                        <TabPanel key={tab.id} value={currentTab} index={index}>
                            {renderTabContent(tab)}
                        </TabPanel>
                    ))}
                </Box>
            </DialogContent>
        </Dialog>
    );
}
