import { prisma } from '../../config/index.js';
import type { FriendshipStatus } from '@prisma/client';

// ─── Friendship Queries ──────────────────────────────

export const findFriendship = async (userId: string, friendId: string) => {
    return prisma.friendship.findFirst({
        where: {
            OR: [
                { requesterId: userId, addresseeId: friendId },
                { requesterId: friendId, addresseeId: userId },
            ],
        },
    });
};

export const findFriends = async (userId: string, status?: FriendshipStatus) => {
    return prisma.friendship.findMany({
        where: {
            OR: [
                { requesterId: userId },
                { addresseeId: userId },
            ],
            ...(status ? { status } : {}),
        },
        include: {
            requester: { select: { id: true, displayName: true, email: true, avatarUrl: true } },
            addressee: { select: { id: true, displayName: true, email: true, avatarUrl: true } },
        },
        orderBy: { updatedAt: 'desc' },
    });
};

export const findPendingRequests = async (userId: string) => {
    return prisma.friendship.findMany({
        where: {
            addresseeId: userId,
            status: 'PENDING',
        },
        include: {
            requester: { select: { id: true, displayName: true, email: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
    });
};

export const createFriendship = async (requesterId: string, addresseeId: string, companyId: string) => {
    return prisma.friendship.create({
        data: {
            requesterId,
            addresseeId,
            companyId,
            status: 'PENDING',
        },
        include: {
            requester: { select: { id: true, displayName: true, email: true } },
            addressee: { select: { id: true, displayName: true, email: true } },
        },
    });
};

export const updateFriendshipStatus = async (id: string, status: FriendshipStatus) => {
    return prisma.friendship.update({
        where: { id },
        data: { status },
    });
};

export const deleteFriendship = async (id: string) => {
    return prisma.friendship.delete({ where: { id } });
};

// ─── Friend Location Queries ─────────────────────────

export const findFriendLocations = async (userId: string) => {
    // Get accepted friends
    const friendships = await prisma.friendship.findMany({
        where: {
            OR: [
                { requesterId: userId },
                { addresseeId: userId },
            ],
            status: 'ACCEPTED',
        },
        select: { requesterId: true, addresseeId: true },
    });

    const friendIds = friendships.map(f =>
        f.requesterId === userId ? f.addresseeId : f.requesterId,
    );

    if (friendIds.length === 0) return [];

    // Get active bookings (checked in) for friends
    return prisma.booking.findMany({
        where: {
            companyUserId: { in: friendIds },
            status: 'CHECKED_IN',
        },
        select: {
            companyUserId: true,
            spaceId: true,
            space: {
                select: {
                    id: true,
                    externalId: true,
                    buildingId: true,
                    floorId: true,
                    sortOrder: true,
                },
            },
            companyUser: {
                select: { id: true, displayName: true, avatarUrl: true },
            },
        },
    });
};

// ─── CompanyUser Queries ─────────────────────────────

export const findCompanyUserById = async (id: string) => {
    return prisma.companyUser.findUnique({
        where: { id },
        select: {
            id: true,
            companyId: true,
            displayName: true,
            email: true,
        },
    });
};

export const findCompanyUsers = async (companyId: string) => {
    return prisma.companyUser.findMany({
        where: { companyId, isActive: true },
        select: {
            id: true,
            email: true,
            displayName: true,
            avatarUrl: true,
            role: true,
            branchId: true,
            buildingId: true,
            floorId: true,
        },
        orderBy: { displayName: 'asc' },
    });
};

export const createCompanyUser = async (data: {
    companyId: string;
    branchId: string;
    email: string;
    displayName: string;
    role?: string;
    buildingId?: string;
    floorId?: string;
}) => {
    return prisma.companyUser.create({
        data: {
            companyId: data.companyId,
            branchId: data.branchId,
            email: data.email,
            displayName: data.displayName,
            role: (data.role as any) ?? 'EMPLOYEE',
            buildingId: data.buildingId ?? null,
            floorId: data.floorId ?? null,
        },
    });
};

export const updateCompanyUser = async (id: string, data: Partial<{
    displayName: string;
    role: string;
    branchId: string;
    buildingId: string | null;
    floorId: string | null;
    isActive: boolean;
}>) => {
    return prisma.companyUser.update({
        where: { id },
        data: data as any,
    });
};
