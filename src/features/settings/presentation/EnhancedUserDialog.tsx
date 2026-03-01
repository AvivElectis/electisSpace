/**
 * Enhanced User Dialog - Unified
 *
 * @description Comprehensive dialog for creating, editing users, AND self-profile editing.
 * Split into sub-components for maintainability:
 * - useUserDialogState: all state, effects, and handlers
 * - UserProfileHeader: avatar, name, role badge, edit toggle
 * - UserAccountStats: login count, last login, member since
 * - UserBasicInfoSection: email, name, phone, password, active toggle
 * - UserCompanySection: company selector and role
 * - UserStoreSection: store assignments
 * - UserPasswordSection: password change/reset
 */
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Alert,
    Box,
    Divider,
    CircularProgress,
    Stepper,
    Step,
    StepLabel,
    useTheme,
    useMediaQuery,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import { useTranslation } from 'react-i18next';
import { useUserDialogState } from './userDialog/useUserDialogState';
import { UserProfileHeader } from './userDialog/UserProfileHeader';
import { UserAccountStats } from './userDialog/UserAccountStats';
import { UserBasicInfoSection } from './userDialog/UserBasicInfoSection';
import { UserCompanySection } from './userDialog/UserCompanySection';
import { UserStoreSection } from './userDialog/UserStoreSection';
import { UserPasswordSection } from './userDialog/UserPasswordSection';
import { UserAppRoleSection } from './userDialog/UserAppRoleSection';
import { CREATE_STEPS, type UserData } from './userDialog/types';

interface EnhancedUserDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: () => void;
    user?: UserData | null;
    profileMode?: boolean;
}

export function EnhancedUserDialog({ open, onClose, onSave, user, profileMode = false }: EnhancedUserDialogProps) {
    const { t } = useTranslation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isRtl = theme.direction === 'rtl';

    const state = useUserDialogState({ open, onClose, onSave, user, profileMode });

    // Edit/Profile mode - unified layout
    if (state.isEdit) {
        return (
            <Dialog
                open={open}
                onClose={state.submitting ? undefined : onClose}
                maxWidth="sm"
                fullWidth
                fullScreen={isMobile}
                PaperProps={{ sx: { maxHeight: isMobile ? '100%' : '90vh', borderRadius: isMobile ? 0 : undefined } }}
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <PersonIcon />
                    {profileMode ? t('settings.users.editProfile') : t('settings.users.editUser')}
                </DialogTitle>

                <DialogContent dividers>
                    {state.profileLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {state.error && <Alert severity="error" onClose={() => state.setError(null)}>{state.error}</Alert>}
                            {state.success && <Alert severity="success" onClose={() => state.setSuccess(null)}>{state.success}</Alert>}

                            <UserProfileHeader
                                firstName={state.firstName}
                                lastName={state.lastName}
                                email={state.email}
                                userData={state.userData}
                                isEdit={state.isEdit}
                                isEditing={state.isEditing}
                                onEditToggle={() => state.setIsEditing(true)}
                                getInitials={state.getInitials}
                                getRoleLabel={state.getRoleLabel}
                                getRoleBadgeColor={state.getRoleBadgeColor}
                            />

                            <Divider />

                            <UserBasicInfoSection
                                email={state.email}
                                emailError={state.emailError}
                                checkingEmail={state.checkingEmail}
                                onEmailChange={state.handleEmailChange}
                                firstName={state.firstName}
                                onFirstNameChange={state.setFirstName}
                                lastName={state.lastName}
                                onLastNameChange={state.setLastName}
                                phone={state.phone}
                                onPhoneChange={state.setPhone}
                                password={state.password}
                                onPasswordChange={state.setPassword}
                                isActive={state.isActive}
                                onIsActiveChange={state.setIsActive}
                                isEdit={state.isEdit}
                                isEditing={state.isEditing}
                                profileMode={profileMode}
                            />

                            {!profileMode && state.canEditAppRole && (
                                <>
                                    <Divider />
                                    <UserAppRoleSection
                                        appRole={state.appRole}
                                        onAppRoleChange={state.handleAppRoleChange}
                                        allowedRoles={state.allowedAppRoles}
                                        disabled={!state.isEditing}
                                    />
                                </>
                            )}

                            <Divider />

                            <UserAccountStats userData={state.userData} />

                            {/* Company Section */}
                            {(!profileMode || (state.userData?.companies && state.userData.companies.length > 0)) && (
                                <>
                                    <Divider />
                                    <UserCompanySection
                                        selectedCompanyId={state.selectedCompanyId}
                                        isCreatingCompany={state.isCreatingCompany}
                                        newCompanyData={state.newCompanyData}
                                        companyRoleId={state.companyRoleId}
                                        allStoresAccess={state.allStoresAccess}
                                        isPlatformAdmin={state.isPlatformAdmin}
                                        targetGlobalRole={state.userData?.globalRole}
                                        accessibleCompanyId={state.accessibleCompanyId}
                                        isEdit={state.isEdit}
                                        isEditing={state.isEditing}
                                        profileMode={profileMode}
                                        onCompanyChange={state.handleCompanyChange}
                                        onCreateModeChange={state.setIsCreatingCompany}
                                        onNewCompanyDataChange={state.setNewCompanyData}
                                        onCompanyRoleChange={state.handleCompanyRoleChange}
                                        onAllStoresAccessChange={state.handleAllStoresAccessChange}
                                    />
                                </>
                            )}

                            {/* Store Section — show when not allStoresAccess, or in profile mode if user has stores */}
                            {(!profileMode || (state.userData?.stores && state.userData.stores.length > 0) || !state.allStoresAccess) && (
                                <>
                                    <Divider />
                                    <UserStoreSection
                                        companyId={state.selectedCompanyId}
                                        isCreatingCompany={state.isCreatingCompany}
                                        allStoresAccess={state.allStoresAccess}
                                        assignments={state.storeAssignments}
                                        onAssignmentsChange={state.setStoreAssignments}
                                        isEdit={state.isEdit}
                                        isEditing={state.isEditing}
                                        companyEnabledFeatures={state.companyEnabledFeatures}
                                        targetGlobalRole={state.userData?.globalRole}
                                    />
                                </>
                            )}

                            <Divider />

                            <UserPasswordSection
                                profileMode={profileMode}
                                isRtl={isRtl}
                                submitting={state.submitting}
                                showPasswordSection={state.showPasswordSection}
                                onShowPasswordSectionChange={state.setShowPasswordSection}
                                currentPassword={state.currentPassword}
                                onCurrentPasswordChange={state.setCurrentPassword}
                                newPassword={state.newPassword}
                                onNewPasswordChange={state.setNewPassword}
                                confirmPassword={state.confirmPassword}
                                onConfirmPasswordChange={state.setConfirmPassword}
                                showCurrentPassword={state.showCurrentPassword}
                                onShowCurrentPasswordChange={state.setShowCurrentPassword}
                                showNewPassword={state.showNewPassword}
                                onShowNewPasswordChange={state.setShowNewPassword}
                                onChangePassword={state.handleChangePassword}
                                onResetPassword={state.handleSubmit}
                            />
                        </Box>
                    )}
                </DialogContent>

                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={onClose} disabled={state.submitting}>
                        {state.isEditing ? t('common.cancel') : t('common.close')}
                    </Button>
                    {state.isEditing && (
                        <Button
                            variant="contained"
                            onClick={state.handleSubmit}
                            disabled={state.submitting || state.profileLoading || (state.newPassword.length > 0 && state.newPassword !== state.confirmPassword)}
                            startIcon={state.submitting ? <CircularProgress size={16} /> : null}
                        >
                            {t('common.save')}
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        );
    }

    // Create mode with stepper
    return (
        <Dialog
            open={open}
            onClose={state.submitting ? undefined : onClose}
            maxWidth="sm"
            fullWidth
            fullScreen={isMobile}
            PaperProps={{ sx: { maxHeight: isMobile ? '100%' : '90vh', borderRadius: isMobile ? 0 : undefined } }}
        >
            <DialogTitle>
                {t('settings.users.addUser')}
            </DialogTitle>

            <DialogContent dividers>
                {state.error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => state.setError(null)}>
                        {state.error}
                    </Alert>
                )}

                <Stepper
                    activeStep={state.activeStep}
                    sx={{
                        mb: 3,
                        '& .MuiStepLabel-label': {
                            fontSize: { xs: '0.75rem', sm: '0.875rem' }
                        },
                        ...(isRtl && {
                            '& .MuiStepConnector-root': {
                                left: 'calc(50% + 20px)',
                                right: 'calc(-50% + 20px)',
                            },
                        })
                    }}
                    alternativeLabel
                >
                    {CREATE_STEPS.map((step) => (
                        <Step key={step}>
                            <StepLabel>
                                {t(`settings.users.steps.${step}`)}
                            </StepLabel>
                        </Step>
                    ))}
                </Stepper>

                {state.activeStep === 0 && (
                    <UserBasicInfoSection
                        email={state.email}
                        emailError={state.emailError}
                        checkingEmail={state.checkingEmail}
                        onEmailChange={state.handleEmailChange}
                        firstName={state.firstName}
                        onFirstNameChange={state.setFirstName}
                        lastName={state.lastName}
                        onLastNameChange={state.setLastName}
                        phone={state.phone}
                        onPhoneChange={state.setPhone}
                        password={state.password}
                        onPasswordChange={state.setPassword}
                        isActive={state.isActive}
                        onIsActiveChange={state.setIsActive}
                        isEdit={state.isEdit}
                        isEditing={state.isEditing}
                        profileMode={profileMode}
                    />
                )}
                {state.activeStep === 1 && (
                    <UserCompanySection
                        selectedCompanyId={state.selectedCompanyId}
                        isCreatingCompany={state.isCreatingCompany}
                        newCompanyData={state.newCompanyData}
                        companyRoleId={state.companyRoleId}
                        allStoresAccess={state.allStoresAccess}
                        isPlatformAdmin={state.isPlatformAdmin}
                        targetGlobalRole={state.userData?.globalRole}
                        accessibleCompanyId={state.accessibleCompanyId}
                        isEdit={state.isEdit}
                        isEditing={state.isEditing}
                        onCompanyChange={state.handleCompanyChange}
                        onCreateModeChange={state.setIsCreatingCompany}
                        onNewCompanyDataChange={state.setNewCompanyData}
                        onCompanyRoleChange={state.handleCompanyRoleChange}
                        onAllStoresAccessChange={state.handleAllStoresAccessChange}
                    />
                )}
                {state.activeStep === 2 && (
                    <UserStoreSection
                        companyId={state.selectedCompanyId}
                        isCreatingCompany={state.isCreatingCompany}
                        allStoresAccess={state.allStoresAccess}
                        assignments={state.storeAssignments}
                        onAssignmentsChange={state.setStoreAssignments}
                        isEdit={state.isEdit}
                        isEditing={state.isEditing}
                        targetGlobalRole={state.userData?.globalRole}
                    />
                )}
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2, flexWrap: 'wrap', gap: 1 }}>
                <Button onClick={onClose} disabled={state.submitting}>
                    {t('common.cancel')}
                </Button>

                {state.activeStep > 0 && (
                    <Button onClick={state.handleBack} disabled={state.submitting}>
                        {t('common.back')}
                    </Button>
                )}

                {state.activeStep < CREATE_STEPS.length - 1 ? (
                    <Button
                        variant="contained"
                        onClick={state.handleNext}
                        disabled={!state.isStepValid(state.activeStep)}
                    >
                        {t('common.next')}
                    </Button>
                ) : (
                    <Button
                        variant="contained"
                        onClick={state.handleSubmit}
                        disabled={state.submitting || !state.isStepValid(state.activeStep)}
                        startIcon={state.submitting ? <CircularProgress size={16} /> : null}
                    >
                        {t('common.create')}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
}

export default EnhancedUserDialog;
