import { badRequest, notFound, conflict, forbidden } from '../../shared/middleware/index.js';
import { appLogger } from '../../shared/infrastructure/services/appLogger.js';
import { emitFriendEvent } from '../../shared/infrastructure/services/compassSocket.js';
import * as repo from './repository.js';

// ─── List Friends ────────────────────────────────────

export const listFriends = async (userId: string) => {
    const friendships = await repo.findFriends(userId, 'ACCEPTED');

    return friendships.map(f => {
        const friend = f.requesterId === userId ? f.addressee : f.requester;
        return {
            friendshipId: f.id,
            ...friend,
        };
    });
};

// ─── List Pending Requests ───────────────────────────

export const listPendingRequests = async (userId: string) => {
    return repo.findPendingRequests(userId);
};

// ─── Send Friend Request ─────────────────────────────

export const sendRequest = async (requesterId: string, addresseeId: string) => {
    if (requesterId === addresseeId) {
        throw badRequest('Cannot send friend request to yourself');
    }

    // Check both users exist and are in same company
    const requester = await repo.findCompanyUserById(requesterId);
    const addressee = await repo.findCompanyUserById(addresseeId);

    if (!requester || !addressee) {
        throw notFound('User not found');
    }

    if (requester.companyId !== addressee.companyId) {
        throw forbidden('Users must be in the same company');
    }

    // Check for existing friendship
    const existing = await repo.findFriendship(requesterId, addresseeId);
    if (existing) {
        if (existing.status === 'ACCEPTED') {
            throw conflict('Already friends');
        }
        if (existing.status === 'PENDING') {
            throw conflict('Friend request already pending');
        }
        if (existing.status === 'BLOCKED') {
            throw forbidden('Unable to send friend request');
        }
    }

    const friendship = await repo.createFriendship(requesterId, addresseeId, requester.companyId);
    appLogger.info('CompassFriends', `Friend request sent`, {
        requesterId,
        addresseeId,
    });

    emitFriendEvent('friend:request', addresseeId, {
        friendshipId: friendship.id,
        requesterId,
        requesterName: requester.displayName,
    });

    return friendship;
};

// ─── Accept Friend Request ───────────────────────────

export const acceptRequest = async (userId: string, friendshipId: string) => {
    const friendships = await repo.findFriends(userId);
    const friendship = friendships.find(f => f.id === friendshipId);

    if (!friendship) {
        throw notFound('Friend request not found');
    }

    if (friendship.addresseeId !== userId) {
        throw forbidden('Only the addressee can accept a request');
    }

    if (friendship.status !== 'PENDING') {
        throw badRequest('Request is not pending');
    }

    const updated = await repo.updateFriendshipStatus(friendshipId, 'ACCEPTED');
    appLogger.info('CompassFriends', `Friend request accepted`, { friendshipId });

    return updated;
};

// ─── Remove Friend / Decline Request ─────────────────

export const removeFriend = async (userId: string, friendshipId: string) => {
    const friendships = await repo.findFriends(userId);
    const friendship = friendships.find(f => f.id === friendshipId);

    if (!friendship) {
        throw notFound('Friendship not found');
    }

    if (friendship.requesterId !== userId && friendship.addresseeId !== userId) {
        throw forbidden('Not your friendship');
    }

    await repo.deleteFriendship(friendshipId);
    appLogger.info('CompassFriends', `Friendship removed`, { friendshipId });

    return { message: 'Friendship removed' };
};

// ─── Block User ──────────────────────────────────────

export const blockUser = async (userId: string, friendshipId: string) => {
    const friendships = await repo.findFriends(userId);
    const friendship = friendships.find(f => f.id === friendshipId);

    if (!friendship) {
        throw notFound('Friendship not found');
    }

    await repo.updateFriendshipStatus(friendshipId, 'BLOCKED');
    appLogger.info('CompassFriends', `User blocked`, { friendshipId, userId });

    return { message: 'User blocked' };
};

// ─── Friend Locations ────────────────────────────────

export const getFriendLocations = async (userId: string) => {
    return repo.findFriendLocations(userId);
};

// ─── Proximity Sorting ──────────────────────────────

export interface SpaceWithProximity {
    spaceId: string;
    buildingId: string | null;
    floorId: string | null;
    sortOrder: number;
    proximityScore: number;
    nearestFriend: string | null;
}

/**
 * Sort spaces by proximity to checked-in friends.
 * Proximity tiers:
 *   1. Same floor: distance = |sortOrder diff|
 *   2. Same building: distance = 1000 + |sortOrder diff|
 *   3. Different building: distance = 10000
 */
export const sortByFriendProximity = async (
    userId: string,
    spaces: Array<{ id: string; buildingId: string | null; floorId: string | null; sortOrder: number }>,
) => {
    const friendLocations = await repo.findFriendLocations(userId);

    if (friendLocations.length === 0) {
        // No friends checked in — return original order
        return spaces.map(s => ({ ...s, proximityScore: Infinity, nearestFriend: null }));
    }

    return spaces.map(space => {
        let bestScore = Infinity;
        let nearestFriend: string | null = null;

        for (const loc of friendLocations) {
            const friendSpace = loc.space;
            let score: number;

            if (space.floorId && space.floorId === friendSpace.floorId) {
                // Same floor
                score = Math.abs(space.sortOrder - friendSpace.sortOrder);
            } else if (space.buildingId && space.buildingId === friendSpace.buildingId) {
                // Same building, different floor
                score = 1000 + Math.abs(space.sortOrder - friendSpace.sortOrder);
            } else {
                // Different building
                score = 10000;
            }

            if (score < bestScore) {
                bestScore = score;
                nearestFriend = loc.companyUser.displayName;
            }
        }

        return { ...space, proximityScore: bestScore, nearestFriend };
    }).sort((a, b) => a.proximityScore - b.proximityScore);
};
