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
import { requestIdMiddleware } from './shared/middleware/requestId.js';

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
import adminRoutes from './features/admin/routes.js';
import labelsRoutes from './features/labels/routes.js';
import peopleListsRoutes from './features/people-lists/routes.js';
import spacesListsRoutes from './features/spaces-lists/routes.js';
import storeEventsRoutes from './features/stores/events.routes.js';

// Create Express app
const app = express();

// ======================
// Request ID (for log correlation)
// ======================
app.use(requestIdMiddleware);

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
// Compression - but SKIP SSE endpoints (text/event-stream) as compression breaks streaming
app.use(compression({
    filter: (req, res) => {
        // Don't compress SSE responses
        if (res.getHeader('Content-Type') === 'text/event-stream') {
            return false;
        }
        return compression.filter(req, res);
    }
}));

// ======================
// Logging
// ======================
if (config.isDev) {
    // Include request ID in dev logs
    morgan.token('request-id', (req: express.Request) => req.requestId || '-');
    app.use(morgan(':method :url :status :response-time ms - :request-id'));
} else {
    morgan.token('request-id', (req: express.Request) => req.requestId || '-');
    app.use(morgan(':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :request-id'));
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
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/labels', labelsRoutes);
apiRouter.use('/people-lists', peopleListsRoutes);
apiRouter.use('/spaces-lists', spacesListsRoutes);
apiRouter.use('/', storeEventsRoutes);  // Mounts /stores/:storeId/events
apiRouter.use('/health', healthRoutes);  // Also mount health inside API for proxy access

app.use(`/api/${config.apiVersion}`, apiRouter);

// ======================
// Error Handling
// ======================
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
