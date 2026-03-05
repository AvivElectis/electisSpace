export type FriendshipStatus = 'PENDING' | 'ACCEPTED' | 'BLOCKED';

export interface Friend {
    id: string;
    friendshipId: string;
    displayName: string;
    email: string;
    avatarUrl: string | null;
    status: FriendshipStatus;
    checkedInSpace: {
        id: string;
        displayName: string;
        buildingName: string | null;
        floorName: string | null;
    } | null;
}

export interface FriendRequest {
    id: string;
    requester: {
        id: string;
        displayName: string;
        email: string;
    };
    createdAt: string;
}
