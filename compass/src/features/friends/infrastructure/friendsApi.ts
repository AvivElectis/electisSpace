import compassApi from '@shared/api/compassApi';
import type { Friend, FriendRequest } from '../domain/types';

export const friendsApi = {
    list: () =>
        compassApi.get<{ data: Friend[] }>('/friends'),

    getLocations: () =>
        compassApi.get<{ data: Friend[] }>('/friends/locations'),

    sendRequest: (email: string) =>
        compassApi.post<{ data: { id: string } }>('/friends/request', { email }),

    getPendingRequests: () =>
        compassApi.get<{ data: FriendRequest[] }>('/friends/requests'),

    acceptRequest: (friendshipId: string) =>
        compassApi.patch<{ success: boolean }>(`/friends/${friendshipId}/accept`),

    declineRequest: (friendshipId: string) =>
        compassApi.delete<{ success: boolean }>(`/friends/${friendshipId}`),

    removeFriend: (friendshipId: string) =>
        compassApi.delete<{ success: boolean }>(`/friends/${friendshipId}`),

    blockUser: (userId: string) =>
        compassApi.post<{ success: boolean }>(`/friends/block`, { userId }),
};
