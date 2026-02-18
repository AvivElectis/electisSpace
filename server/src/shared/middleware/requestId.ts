/**
 * Request ID Middleware
 * 
 * Adds a unique request ID to every request for log correlation.
 * The ID is:
 * - Generated if not provided in X-Request-ID header
 * - Added to the response header
 * - Attached to the request object for use in handlers
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Extend Express Request to include requestId
declare global {
    namespace Express {
        interface Request {
            requestId?: string;
        }
    }
}

/**
 * Request ID middleware
 * Generates or passes through a request ID for log correlation
 */
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    // Use existing ID from header or generate new one
    const requestId = (req.headers['x-request-id'] as string) || uuidv4();
    
    // Attach to request object
    req.requestId = requestId;
    
    // Add to response headers
    res.setHeader('X-Request-ID', requestId);
    
    next();
};

export default requestIdMiddleware;
