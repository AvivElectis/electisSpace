import { Request, Response } from 'express';

export const notFoundHandler = (req: Request, res: Response): void => {
    res.status(404).json({
        error: {
            code: 'NOT_FOUND',
            message: `Route ${req.method} ${req.path} not found`,
        },
    });
};
