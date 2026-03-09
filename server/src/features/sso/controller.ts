import type { Request, Response, NextFunction } from 'express';
import { SAML } from '@node-saml/node-saml';
import * as client from 'openid-client';
import * as service from './service.js';
import { createSsoConfigSchema, updateSsoConfigSchema, type SsoUserClaims } from './types.js';
import { badRequest } from '../../shared/middleware/index.js';
import { appLogger } from '../../shared/infrastructure/services/appLogger.js';
import { prisma } from '../../config/index.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET ?? (() => {
    if (process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET must be set in production');
    return 'dev-secret'; // pragma: allowlist secret
})();
const JWT_EXPIRES_IN = '15m';
const REFRESH_EXPIRES_IN = '7d';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

// ─── Admin CRUD ──────────────────────────────────────

export async function list(req: Request, res: Response, next: NextFunction) {
    try {
        const companyId = req.params.companyId as string;
        const configs = await service.listSsoConfigs(companyId);
        // Strip sensitive fields
        const safe = configs.map(c => ({ ...c, clientSecret: undefined, x509Certificate: c.x509Certificate ? '[configured]' : null }));
        res.json({ data: safe });
    } catch (err) { next(err); }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
    try {
        const companyId = req.params.companyId as string;
        const id = req.params.id as string;
        const config = await service.getSsoConfig(id, companyId);
        res.json({ data: { ...config, clientSecret: undefined } });
    } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
    try {
        const companyId = req.params.companyId as string;
        const data = createSsoConfigSchema.parse(req.body);
        const config = await service.createSsoConfig(companyId, data);
        res.status(201).json({ data: config });
    } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
    try {
        const companyId = req.params.companyId as string;
        const id = req.params.id as string;
        const data = updateSsoConfigSchema.parse(req.body);
        const config = await service.updateSsoConfig(id, companyId, data);
        res.json({ data: config });
    } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
    try {
        const companyId = req.params.companyId as string;
        const id = req.params.id as string;
        await service.deleteSsoConfig(id, companyId);
        res.status(204).end();
    } catch (err) { next(err); }
}

// ─── Test Connection ─────────────────────────────────

export async function testConnection(req: Request, res: Response, next: NextFunction) {
    try {
        const { protocol, ssoUrl, idpEntityId, x509Certificate, discoveryUrl, clientId } = req.body;

        if (protocol === 'SAML') {
            if (!ssoUrl) throw badRequest('SSO URL is required for SAML test');
            // Test: fetch the SSO URL to verify it's reachable
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10_000);
            try {
                const resp = await fetch(ssoUrl, { method: 'GET', signal: controller.signal, redirect: 'manual' });
                clearTimeout(timeout);
                // SAML SSO URLs typically return 200 (login form) or 302 (redirect)
                if (resp.status >= 500) {
                    return res.json({ success: false, error: `SSO URL returned status ${resp.status}` });
                }
                return res.json({
                    success: true,
                    details: {
                        ssoUrlReachable: true,
                        ssoUrlStatus: resp.status,
                        hasCertificate: !!x509Certificate,
                        hasEntityId: !!idpEntityId,
                    },
                });
            } catch (err: any) {
                clearTimeout(timeout);
                return res.json({ success: false, error: `Cannot reach SSO URL: ${err.message}` });
            }
        }

        if (protocol === 'OIDC') {
            if (!discoveryUrl) throw badRequest('Discovery URL is required for OIDC test');
            // Test: fetch the OIDC discovery document
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10_000);
            try {
                const resp = await fetch(discoveryUrl, { signal: controller.signal });
                clearTimeout(timeout);
                if (!resp.ok) {
                    return res.json({ success: false, error: `Discovery URL returned status ${resp.status}` });
                }
                const doc = await resp.json() as Record<string, unknown>;
                const hasRequired = !!(doc.authorization_endpoint && doc.token_endpoint && doc.issuer);
                return res.json({
                    success: hasRequired,
                    error: hasRequired ? undefined : 'Discovery document missing required fields (authorization_endpoint, token_endpoint, issuer)',
                    details: {
                        issuer: doc.issuer,
                        authorizationEndpoint: doc.authorization_endpoint,
                        tokenEndpoint: doc.token_endpoint,
                        hasClientId: !!clientId,
                    },
                });
            } catch (err: any) {
                clearTimeout(timeout);
                return res.json({ success: false, error: `Cannot reach Discovery URL: ${err.message}` });
            }
        }

        throw badRequest(`Unsupported protocol: ${protocol}`);
    } catch (err) { next(err); }
}

// ─── SSO Login Flow ──────────────────────────────────

export async function initLogin(req: Request, res: Response, next: NextFunction) {
    try {
        const { email } = req.query;
        if (!email || typeof email !== 'string') throw badRequest('Email is required');

        const domain = email.split('@')[1]?.toLowerCase();
        if (!domain) throw badRequest('Invalid email format');

        const config = await service.findSsoConfigByDomain(domain);
        if (!config) {
            return res.json({ ssoEnabled: false });
        }

        if (config.protocol === 'SAML') {
            const saml = createSamlClient(config);
            const loginUrl = await saml.getAuthorizeUrlAsync('', undefined, {});
            return res.json({ ssoEnabled: true, protocol: 'SAML', redirectUrl: loginUrl });
        }

        if (config.protocol === 'OIDC') {
            const redirectUri = `${APP_URL}/api/v2/auth/sso/oidc/callback`;
            const oidcConfig = await client.discovery(new URL(config.discoveryUrl!), config.clientId!, config.clientSecret || undefined);
            const codeVerifier = client.randomPKCECodeVerifier();
            const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
            const state = Buffer.from(JSON.stringify({ configId: config.id, codeVerifier })).toString('base64url');

            const authUrl = client.buildAuthorizationUrl(oidcConfig, {
                redirect_uri: redirectUri,
                scope: config.scopes || 'openid profile email',
                code_challenge: codeChallenge,
                code_challenge_method: 'S256',
                state,
            });

            return res.json({ ssoEnabled: true, protocol: 'OIDC', redirectUrl: authUrl.href });
        }

        throw badRequest(`Unsupported SSO protocol: ${config.protocol}`);
    } catch (err) { next(err); }
}

// ─── SAML Callback ───────────────────────────────────

export async function samlCallback(req: Request, res: Response, next: NextFunction) {
    try {
        const samlResponse = req.body.SAMLResponse;
        if (!samlResponse) throw badRequest('Missing SAMLResponse');

        // RelayState contains the config ID
        const relayState = req.body.RelayState;
        let configId: string | undefined;
        try {
            const parsed = JSON.parse(Buffer.from(relayState || '', 'base64url').toString());
            configId = parsed.configId;
        } catch { /* ignore */ }

        // Find config — either from RelayState or by checking all active SAML configs
        let config;
        if (configId) {
            config = await prisma.ssoConfig.findFirst({ where: { id: configId, isActive: true } });
        }
        if (!config) {
            // Try to find by parsing the assertion's issuer
            const activeConfigs = await prisma.ssoConfig.findMany({ where: { protocol: 'SAML', isActive: true } });
            for (const c of activeConfigs) {
                try {
                    const saml = createSamlClient(c);
                    const result = await saml.validatePostResponseAsync({ SAMLResponse: samlResponse } as any);
                    config = c;
                    const claims = extractSamlClaims(result.profile, c.claimMapping as Record<string, string> | null);
                    const user = await resolveUser(c, claims);
                    const tokens = issueTokens(user);
                    return res.redirect(`${APP_URL}/#/sso-callback?token=${tokens.accessToken}&refresh=${tokens.refreshToken}`);
                } catch { continue; }
            }
            throw badRequest('No matching SSO configuration found');
        }

        const saml = createSamlClient(config);
        const result = await saml.validatePostResponseAsync({ SAMLResponse: samlResponse } as any);
        const claims = extractSamlClaims(result.profile, config.claimMapping as Record<string, string> | null);
        const user = await resolveUser(config, claims);
        const tokens = issueTokens(user);
        res.redirect(`${APP_URL}/#/sso-callback?token=${tokens.accessToken}&refresh=${tokens.refreshToken}`);
    } catch (err) {
        appLogger.error('SSO', `SAML callback error: ${(err as Error).message}`);
        next(err);
    }
}

// ─── OIDC Callback ───────────────────────────────────

export async function oidcCallback(req: Request, res: Response, next: NextFunction) {
    try {
        const { state, code } = req.query;
        if (!state || !code) throw badRequest('Missing state or code');

        const stateData = JSON.parse(Buffer.from(state as string, 'base64url').toString());
        const { configId, codeVerifier } = stateData;

        const config = await prisma.ssoConfig.findFirst({ where: { id: configId, isActive: true } });
        if (!config) throw badRequest('SSO configuration not found');

        const redirectUri = `${APP_URL}/api/v2/auth/sso/oidc/callback`;
        const oidcConfig = await client.discovery(new URL(config.discoveryUrl!), config.clientId!, config.clientSecret || undefined);
        const currentUrl = new URL(`${redirectUri}?code=${code}&state=${state}`);

        const tokens = await client.authorizationCodeGrant(oidcConfig, currentUrl, {
            pkceCodeVerifier: codeVerifier,
            expectedState: state as string,
        });

        const userInfo = await client.fetchUserInfo(oidcConfig, tokens.access_token!, tokens.claims()!.sub);
        const claims: SsoUserClaims = {
            email: (userInfo.email as string) || '',
            firstName: (userInfo.given_name as string) || undefined,
            lastName: (userInfo.family_name as string) || undefined,
            displayName: (userInfo.name as string) || undefined,
        };

        const user = await resolveUser(config, claims);
        const jwtTokens = issueTokens(user);
        res.redirect(`${APP_URL}/#/sso-callback?token=${jwtTokens.accessToken}&refresh=${jwtTokens.refreshToken}`);
    } catch (err) {
        appLogger.error('SSO', `OIDC callback error: ${(err as Error).message}`);
        next(err);
    }
}

// ─── SP Metadata (SAML) ─────────────────────────────

export async function spMetadata(req: Request, res: Response, next: NextFunction) {
    try {
        const callbackUrl = `${APP_URL}/api/v2/auth/sso/callback`;
        const entityId = `${APP_URL}/api/v2/auth/sso/metadata`;

        const metadata = `<?xml version="1.0"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata"
    entityID="${entityId}">
  <SPSSODescriptor
      AuthnRequestsSigned="false"
      WantAssertionsSigned="true"
      protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <AssertionConsumerService
        Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
        Location="${callbackUrl}"
        index="1" />
  </SPSSODescriptor>
</EntityDescriptor>`;

        res.type('application/xml').send(metadata);
    } catch (err) { next(err); }
}

// ─── Helpers ─────────────────────────────────────────

function createSamlClient(config: any): SAML {
    return new SAML({
        callbackUrl: `${APP_URL}/api/v2/auth/sso/callback`,
        entryPoint: config.ssoUrl,
        issuer: `${APP_URL}/api/v2/auth/sso/metadata`,
        idpIssuer: config.idpEntityId,
        idpCert: config.x509Certificate || '',
        wantAssertionsSigned: true,
        wantAuthnResponseSigned: false,
    });
}

function extractSamlClaims(profile: any, claimMapping: Record<string, string> | null): SsoUserClaims {
    if (claimMapping) {
        return {
            email: profile[claimMapping.email || 'email'] || profile.nameID || '',
            firstName: profile[claimMapping.firstName || 'firstName'] || undefined,
            lastName: profile[claimMapping.lastName || 'lastName'] || undefined,
            displayName: profile[claimMapping.displayName || 'displayName'] || undefined,
            department: profile[claimMapping.department || 'department'] || undefined,
            jobTitle: profile[claimMapping.jobTitle || 'jobTitle'] || undefined,
        };
    }

    return {
        email: profile.nameID || profile.email || '',
        firstName: profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname'] || profile.firstName || undefined,
        lastName: profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname'] || profile.lastName || undefined,
        displayName: profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || profile.displayName || undefined,
    };
}

async function resolveUser(config: any, claims: SsoUserClaims) {
    if (!claims.email) throw badRequest('SSO assertion missing email claim');

    const existing = await prisma.companyUser.findFirst({
        where: { companyId: config.companyId, email: claims.email.toLowerCase() },
    });

    if (existing) return existing;

    if (!config.autoProvision) {
        throw badRequest('User not found and auto-provisioning is disabled');
    }

    return service.findOrCreateSsoUser(config.companyId, claims);
}

function issueTokens(user: any) {
    const accessToken = jwt.sign(
        {
            userId: user.id,
            companyId: user.companyId,
            email: user.email,
            role: user.role,
            type: 'compass',
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN },
    );

    const refreshToken = jwt.sign(
        { userId: user.id, type: 'compass_refresh' },
        JWT_SECRET,
        { expiresIn: REFRESH_EXPIRES_IN },
    );

    return { accessToken, refreshToken };
}
