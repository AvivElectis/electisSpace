/**
 * Auth Feature - Module Exports
 */

// Routes (default export for API registration)
export { default as authRoutes } from './routes.js';

// Controller
export { authController } from './controller.js';

// Service
export { authService } from './service.js';

// Repository
export { authRepository } from './repository.js';

// Types
export type {
    LoginDto,
    Verify2FADto,
    ResendCodeDto,
    ForgotPasswordDto,
    ResetPasswordDto,
    AdminResetPasswordDto,
    RefreshDto,
    ChangePasswordDto,
    SolumConnectDto,
    StoreInfo,
    CompanyInfo,
    UserInfo,
    LoginResponse,
    TokenResponse,
    RefreshResponse,
    MeResponse,
    MessageResponse,
    AdminResetResponse,
    SolumConnectResponse,
} from './types.js';

// Schemas
export {
    loginSchema,
    verify2FASchema,
    resendCodeSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    adminResetPasswordSchema,
    refreshSchema,
    changePasswordSchema,
    solumConnectSchema,
} from './types.js';
