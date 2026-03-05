import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/index.js';

// ─── GET /api/v2/compass/dashboard/summary ───────────

export const summary = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = req.params.companyId as string;

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

        const [
            totalEmployees,
            totalSpaces,
            todayBookings,
            activeBookings,
            checkedIn,
        ] = await Promise.all([
            prisma.companyUser.count({ where: { companyId, isActive: true } }),
            prisma.space.count({
                where: {
                    store: { companyId },
                    compassMode: { in: ['AVAILABLE', 'PERMANENT'] },
                    deletedAt: null,
                },
            }),
            prisma.booking.count({
                where: {
                    companyId,
                    startTime: { gte: todayStart, lt: todayEnd },
                },
            }),
            prisma.booking.count({
                where: {
                    companyId,
                    status: { in: ['BOOKED', 'CHECKED_IN'] },
                },
            }),
            prisma.booking.count({
                where: {
                    companyId,
                    status: 'CHECKED_IN',
                },
            }),
        ]);

        const occupancyRate = totalSpaces > 0
            ? Math.round((checkedIn / totalSpaces) * 100)
            : 0;

        const checkInRate = todayBookings > 0
            ? Math.round((checkedIn / todayBookings) * 100)
            : 0;

        res.json({
            data: {
                totalEmployees,
                totalSpaces,
                todayBookings,
                activeBookings,
                checkedIn,
                occupancyRate,
                checkInRate,
            },
        });
    } catch (error) {
        next(error);
    }
};
