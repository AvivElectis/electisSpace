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
    Paper,
    Link,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import BusinessIcon from '@mui/icons-material/Business';
import NewReleasesIcon from '@mui/icons-material/NewReleases';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PersonIcon from '@mui/icons-material/Person';
import BadgeIcon from '@mui/icons-material/Badge';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
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

// Icon mapping for manual sub-tabs
const iconMap: Record<string, React.ReactElement> = {
    RocketLaunch: <RocketLaunchIcon />,
    Business: <BusinessIcon />,
    People: <PeopleIcon />,
    MeetingRoom: <MeetingRoomIcon />,
    Sync: <SyncIcon />,
    Settings: <SettingsIcon />,
};

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
    id?: string;
}

function TabPanel({ children, value, index, id }: TabPanelProps) {
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={id || `tabpanel-${index}`}
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
 * Contact info detail row
 */
function InfoRow({ icon, label, value, href, ltr }: { icon: React.ReactNode; label: string; value: string; href?: string; ltr?: boolean }) {
    const dirProps = ltr ? { dir: 'ltr' as const } : {};
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.75 }}>
            <Box sx={{ color: 'primary.main', display: 'flex', alignItems: 'center' }}>{icon}</Box>
            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 70 }}>
                {label}:
            </Typography>
            {href ? (
                <Link href={href} underline="hover" variant="body2" sx={{ fontWeight: 500 }} {...dirProps}>
                    {value}
                </Link>
            ) : (
                <Typography variant="body2" sx={{ fontWeight: 500 }} {...dirProps}>
                    {value}
                </Typography>
            )}
        </Box>
    );
}

/**
 * Manual Dialog Component
 *
 * Two main tabs:
 * - Contact & Info: Support details, company details, release notes
 * - Manual: In-app user manual with feature sub-tabs
 */
export function ManualDialog({ open, onClose }: ManualDialogProps) {
    const { t } = useTranslation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [mainTab, setMainTab] = useState(0);
    const [manualSubTab, setManualSubTab] = useState(0);

    const handleMainTabChange = (_event: SyntheticEvent, newValue: number) => {
        setMainTab(newValue);
    };

    const handleManualSubTabChange = (_event: SyntheticEvent, newValue: number) => {
        setManualSubTab(newValue);
    };

    const renderManualTabContent = (tab: ManualTab) => (
        <Box>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                    {t(tab.titleKey)}
                </Typography>
                <Divider />
            </Box>
            {tab.sections.map((section, index) => (
                <ManualSection
                    key={section.id}
                    section={section}
                    isLast={index === tab.sections.length - 1}
                />
            ))}
        </Box>
    );

    const renderContactInfo = () => (
        <Box>
            {/* Support Details */}
            <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, mb: 2, bgcolor: 'background.default' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <SupportAgentIcon sx={{ color: 'primary.main' }} />
                    <Typography variant="h6" fontWeight="medium" sx={{ color: 'primary.main' }}>
                        {t('manual.contactInfo.supportTitle')}
                    </Typography>
                </Box>
                <InfoRow
                    icon={<PersonIcon fontSize="small" />}
                    label={t('manual.contactInfo.name')}
                    value={t('manual.contactInfo.supportName')}
                />
                <InfoRow
                    icon={<EmailIcon fontSize="small" />}
                    label={t('manual.contactInfo.email')}
                    value="aviv@electis.co.il"
                    href="mailto:aviv@electis.co.il"
                />
                <InfoRow
                    icon={<PhoneIcon fontSize="small" />}
                    label={t('manual.contactInfo.phone')}
                    value="+972-50-444-2814"
                    href="tel:+972504442814"
                    ltr
                />
            </Paper>

            {/* Company Details */}
            <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, mb: 2, bgcolor: 'background.default' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <BusinessIcon sx={{ color: 'primary.main' }} />
                    <Typography variant="h6" fontWeight="medium" sx={{ color: 'primary.main' }}>
                        {t('manual.contactInfo.companyTitle')}
                    </Typography>
                </Box>
                <InfoRow
                    icon={<EmailIcon fontSize="small" />}
                    label={t('manual.contactInfo.email')}
                    value="support@electis.co.il"
                    href="mailto:support@electis.co.il"
                />
                <InfoRow
                    icon={<PhoneIcon fontSize="small" />}
                    label={t('manual.contactInfo.phone')}
                    value="+972-3-648-4884"
                    href="tel:+97236484884"
                    ltr
                />
                <InfoRow
                    icon={<LocationOnIcon fontSize="small" />}
                    label={t('manual.contactInfo.address')}
                    value={t('manual.contactInfo.companyAddress')}
                />
                <InfoRow
                    icon={<BadgeIcon fontSize="small" />}
                    label={t('manual.contactInfo.companyId')}
                    value="513914481"
                />
            </Paper>

            {/* Release Notes */}
            <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, bgcolor: 'background.default' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <NewReleasesIcon sx={{ color: 'primary.main' }} />
                    <Typography variant="h6" fontWeight="medium" sx={{ color: 'primary.main' }}>
                        {t('manual.contactInfo.releaseNotesTitle')}
                    </Typography>
                </Box>
                {/* Current Version */}
                <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                        v{__APP_VERSION__}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7, mt: 0.5, whiteSpace: 'pre-line' }}>
                        {t('manual.contactInfo.releaseNotesContent')}
                    </Typography>
                </Box>
            </Paper>
        </Box>
    );

    const tabStyle = {
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
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            fullScreen={isMobile}
            slotProps={{
                paper: {
                    sx: {
                        height: isMobile ? '100%' : '85vh',
                        maxHeight: isMobile ? '100%' : '900px',
                        borderRadius: isMobile ? 0 : undefined,
                    }
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

            {/* Main Tabs: Contact & Info | Manual */}
            <Box sx={{ px: { xs: 1, sm: 2 } }}>
                <Tabs
                    value={mainTab}
                    onChange={handleMainTabChange}
                    sx={tabStyle}
                    slotProps={{ indicator: { sx: { display: 'none' } } }}
                >
                    <Tab
                        icon={<InfoOutlinedIcon />}
                        iconPosition="start"
                        label={isMobile ? undefined : t('manual.tabs.contactInfo')}
                    />
                    <Tab
                        icon={<MenuBookIcon />}
                        iconPosition="start"
                        label={isMobile ? undefined : t('manual.tabs.manual')}
                    />
                </Tabs>
            </Box>

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
                    {/* Contact & Info Tab */}
                    <TabPanel value={mainTab} index={0} id="main-tabpanel-0">
                        {renderContactInfo()}
                    </TabPanel>

                    {/* Manual Tab */}
                    <TabPanel value={mainTab} index={1} id="main-tabpanel-1">
                        {/* Manual Sub-Tabs */}
                        <Box sx={{ mb: 2, mx: -1 }}>
                            <Tabs
                                value={manualSubTab}
                                onChange={handleManualSubTabChange}
                                variant="scrollable"
                                scrollButtons="auto"
                                allowScrollButtonsMobile
                                sx={{
                                    ...tabStyle,
                                    '& .MuiTab-root': {
                                        ...tabStyle['& .MuiTab-root'],
                                        minHeight: { xs: 40, sm: 48 },
                                        fontSize: { xs: '0.7rem', sm: '0.8rem' },
                                    },
                                }}
                                slotProps={{ indicator: { sx: { display: 'none' } } }}
                            >
                                {MANUAL_TABS.map((tab) => (
                                    <Tab
                                        key={tab.id}
                                        icon={iconMap[tab.iconName]}
                                        iconPosition="start"
                                        label={isMobile ? undefined : t(tab.titleKey)}
                                    />
                                ))}
                            </Tabs>
                        </Box>

                        {/* Manual Sub-Tab Content */}
                        {MANUAL_TABS.map((tab, index) => (
                            <TabPanel key={tab.id} value={manualSubTab} index={index} id={`manual-subtab-${index}`}>
                                {renderManualTabContent(tab)}
                            </TabPanel>
                        ))}
                    </TabPanel>
                </Box>
            </DialogContent>
        </Dialog>
    );
}
