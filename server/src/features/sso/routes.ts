import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, requireCompassAdmin } from '../../shared/middleware/index.js';
import * as controller from './controller.js';

// Admin SSO config CRUD routes
export const ssoAdminRoutes = Router();
ssoAdminRoutes.get('/:companyId', authenticate, requireCompassAdmin(), controller.list);
ssoAdminRoutes.get('/:companyId/:id', authenticate, requireCompassAdmin(), controller.getById);
ssoAdminRoutes.post('/:companyId', authenticate, requireCompassAdmin(), controller.create);
ssoAdminRoutes.put('/:companyId/:id', authenticate, requireCompassAdmin(), controller.update);
ssoAdminRoutes.delete('/:companyId/:id', authenticate, requireCompassAdmin(), controller.remove);
ssoAdminRoutes.post('/:companyId/test', authenticate, requireCompassAdmin(), controller.testConnection);

// SSO auth flow routes (public — no auth required)
const ssoAuthLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: {
        error: { code: 'SSO_RATE_LIMITED', message: 'Too many SSO requests, please try again later' },
    },
    standardHeaders: true,
    legacyHeaders: false,
});

export const ssoAuthRoutes = Router();
ssoAuthRoutes.use(ssoAuthLimiter);
ssoAuthRoutes.get('/login', controller.initLogin);
ssoAuthRoutes.post('/callback', controller.samlCallback); // SAML POST binding
ssoAuthRoutes.get('/oidc/callback', controller.oidcCallback); // OIDC redirect
ssoAuthRoutes.get('/metadata', controller.spMetadata); // SAML SP metadata
