/**
 * Contact Admin Message Component
 * 
 * Shown to non-admin users when AIMS is not configured for their store/company.
 * Displays admin names so the user knows who to contact.
 */

import { Box, Typography, Stack, Chip } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { useTranslation } from 'react-i18next';

interface AdminContact {
    name: string;
    email: string;
    role: string;
}

interface ContactAdminMessageProps {
    adminContacts: AdminContact[];
    storeName: string;
    companyName: string;
}

export function ContactAdminMessage({
    adminContacts,
    storeName,
    companyName,
}: ContactAdminMessageProps) {
    const { t } = useTranslation();

    const roleLabel = adminContacts[0]?.role === 'store_admin'
        ? t('roles.store_admin', 'Store Admin')
        : t('roles.company_admin', 'Company Admin');

    return (
        <Box>
            <Typography variant="body2" color="error" sx={{ mb: 2 }}>
                {t('auth.notConnectedToAims', 'AIMS is not configured for store "{{store}}" (company "{{company}}"). Please contact an administrator to set up the AIMS connection.', {
                    store: storeName,
                    company: companyName,
                })}
            </Typography>

            {adminContacts.length > 0 && (
                <Box>
                    <Stack direction="row" gap={0.5} alignItems="center" sx={{ mb: 1 }}>
                        <AdminPanelSettingsIcon fontSize="small" color="action" />
                        <Typography variant="subtitle2" color="text.secondary">
                            {t('auth.adminContacts', 'Contact admins ({{role}}):', { role: roleLabel })}
                        </Typography>
                    </Stack>
                    <Stack gap={1}>
                        {adminContacts.map((admin) => (
                            <Chip
                                key={admin.email}
                                icon={<PersonIcon />}
                                label={`${admin.name} (${admin.email})`}
                                variant="outlined"
                                size="small"
                            />
                        ))}
                    </Stack>
                </Box>
            )}

            {adminContacts.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                    {t('auth.noAdminsFound', 'No administrators found for this store or company. Please contact your organization for help.')}
                </Typography>
            )}
        </Box>
    );
}
