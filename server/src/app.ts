import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { config } from './config/index.js';
import { errorHandler } from './shared/middleware/errorHandler.js';
import { notFoundHandler } from './shared/middleware/notFoundHandler.js';

// Import routes
import authRoutes from './features/auth/routes.js';
import userRoutes from './features/users/routes.js';
import companyRoutes from './features/companies/routes.js';
import storeRoutes from './features/stores/routes.js';
import spaceRoutes from './features/spaces/routes.js';
import peopleRoutes from './features/people/routes.js';
import conferenceRoutes from './features/conference/routes.js';
import healthRoutes from './features/health/routes.js';
import syncRoutes from './features/sync/routes.js';
import settingsRoutes from './features/settings/routes.js';

// Create Express app
const app = express();

// ======================
// Security Middleware
// ======================
app.use(helmet());
app.use(
    cors({
        origin: config.corsOrigins,
        credentials: true,
    })
);

// ======================
// Request Parsing
// ======================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(compression());

// ======================
// Logging
// ======================
if (config.isDev) {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// ======================
// Rate Limiting
// ======================
const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    message: {
        error: {
            code: 'RATE_LIMITED',
            message: 'Too many requests, please try again later',
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api', limiter);

// ======================
// Health Check (No Auth)
// ======================
app.use('/health', healthRoutes);

// ======================
// API Routes
// ======================
const apiRouter = express.Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/companies', companyRoutes);
apiRouter.use('/', storeRoutes); // Store routes mounted at root for /companies/:companyId/stores and /stores/:id
apiRouter.use('/spaces', spaceRoutes);
apiRouter.use('/people', peopleRoutes);
apiRouter.use('/conference', conferenceRoutes);
apiRouter.use('/sync', syncRoutes);
apiRouter.use('/settings', settingsRoutes);

app.use(`/api/${config.apiVersion}`, apiRouter);

// ======================
// Error Handling
// ======================
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
