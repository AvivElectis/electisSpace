import { Router } from 'express';
import { authenticate, requireCompassAdmin } from '../../shared/middleware/index.js';
import * as controller from './controller.js';

// Admin SSO config CRUD routes
export const ssoAdminRoutes = Router();
ssoAdminRoutes.get('/:companyId', authenticate, requireCompassAdmin(), controller.list);
ssoAdminRoutes.get('/:companyId/:id', authenticate, requireCompassAdmin(), controller.getById);
ssoAdminRoutes.post('/:companyId', authenticate, requireCompassAdmin(), controller.create);
ssoAdminRoutes.put('/:companyId/:id', authenticate, requireCompassAdmin(), controller.update);
ssoAdminRoutes.delete('/:companyId/:id', authenticate, requireCompassAdmin(), controller.remove);

// SSO auth flow routes (public — no auth required)
export const ssoAuthRoutes = Router();
ssoAuthRoutes.get('/login', controller.initLogin);
ssoAuthRoutes.post('/callback', controller.samlCallback); // SAML POST binding
ssoAuthRoutes.get('/oidc/callback', controller.oidcCallback); // OIDC redirect
ssoAuthRoutes.get('/metadata', controller.spMetadata); // SAML SP metadata
