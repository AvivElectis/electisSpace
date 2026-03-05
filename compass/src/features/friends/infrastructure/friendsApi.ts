import compassApi from '@shared/api/compassApi';
import type { Friend, FriendRequest } from '../domain/types';

export const friendsApi = {
    list: () =>
        compassApi.get<{ friends: Friend[] }>('/friends'),

    getLocations: () =>
        compassApi.get<{ friends: Friend[] }>('/friends/locations'),

    sendRequest: (email: string) =>
        compassApi.post<{ friendship: { id: string } }>('/friends/request', { email }),

    getPendingRequests: () =>
        compassApi.get<{ requests: FriendRequest[] }>('/friends/requests'),

    acceptRequest: (friendshipId: string) =>
        compassApi.patch<{ success: boolean }>(`/friends/${friendshipId}/accept`),

    declineRequest: (friendshipId: string) =>
        compassApi.delete<{ success: boolean }>(`/friends/${friendshipId}`),

    removeFriend: (friendshipId: string) =>
        compassApi.delete<{ success: boolean }>(`/friends/${friendshipId}`),

    blockUser: (userId: string) =>
        compassApi.post<{ success: boolean }>(`/friends/block`, { userId }),
};
