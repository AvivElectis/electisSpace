import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFriendsStore } from '../application/useFriendsStore';

const mockFriend = {
    id: 'f1',
    friendId: 'u2',
    displayName: 'Friend One',
    email: 'friend@test.com',
    status: 'ACCEPTED',
};

const mockRequest = {
    id: 'r1',
    requesterId: 'u3',
    requesterName: 'Requester',
    requesterEmail: 'req@test.com',
    status: 'PENDING',
    createdAt: '2026-03-10T08:00:00Z',
};

vi.mock('../infrastructure/friendsApi', () => ({
    friendsApi: {
        list: vi.fn(),
        getLocations: vi.fn(),
        getPendingRequests: vi.fn(),
        sendRequest: vi.fn(),
        acceptRequest: vi.fn(),
        declineRequest: vi.fn(),
        removeFriend: vi.fn(),
    },
}));

import { friendsApi } from '../infrastructure/friendsApi';

describe('useFriendsStore', () => {
    beforeEach(() => {
        useFriendsStore.setState({
            friends: [],
            pendingRequests: [],
            isLoading: false,
            error: null,
        });
        vi.clearAllMocks();
    });

    it('has correct initial state', () => {
        const state = useFriendsStore.getState();
        expect(state.friends).toEqual([]);
        expect(state.pendingRequests).toEqual([]);
        expect(state.isLoading).toBe(false);
        expect(state.error).toBeNull();
    });

    it('fetchFriends loads friends list', async () => {
        vi.mocked(friendsApi.list).mockResolvedValue({
            data: { data: [mockFriend] },
        } as any);

        await useFriendsStore.getState().fetchFriends();

        const state = useFriendsStore.getState();
        expect(state.friends).toEqual([mockFriend]);
        expect(state.isLoading).toBe(false);
    });

    it('fetchFriends sets error on failure', async () => {
        vi.mocked(friendsApi.list).mockRejectedValue({
            response: { data: { error: { message: 'Network error' } } },
        });

        await useFriendsStore.getState().fetchFriends();

        expect(useFriendsStore.getState().error).toBe('Network error');
    });

    it('fetchFriendLocations updates friends silently', async () => {
        const withLocation = { ...mockFriend, spaceName: 'Desk B' };
        vi.mocked(friendsApi.getLocations).mockResolvedValue({
            data: { data: [withLocation] },
        } as any);

        await useFriendsStore.getState().fetchFriendLocations();

        expect(useFriendsStore.getState().friends).toEqual([withLocation]);
    });

    it('fetchFriendLocations silently fails', async () => {
        useFriendsStore.setState({ friends: [mockFriend] as any });
        vi.mocked(friendsApi.getLocations).mockRejectedValue(new Error('fail'));

        await useFriendsStore.getState().fetchFriendLocations();

        // Friends unchanged on failure
        expect(useFriendsStore.getState().friends).toEqual([mockFriend]);
    });

    it('fetchPendingRequests loads requests', async () => {
        vi.mocked(friendsApi.getPendingRequests).mockResolvedValue({
            data: { data: [mockRequest] },
        } as any);

        await useFriendsStore.getState().fetchPendingRequests();

        expect(useFriendsStore.getState().pendingRequests).toEqual([mockRequest]);
    });

    it('sendRequest returns true on success', async () => {
        vi.mocked(friendsApi.sendRequest).mockResolvedValue({
            data: { data: { id: 'new-req' } },
        } as any);

        const result = await useFriendsStore.getState().sendRequest('new@test.com');

        expect(result).toBe(true);
        expect(friendsApi.sendRequest).toHaveBeenCalledWith('new@test.com');
    });

    it('sendRequest returns false and sets error on failure', async () => {
        vi.mocked(friendsApi.sendRequest).mockRejectedValue({
            response: { data: { error: { message: 'Already friends' } } },
        });

        const result = await useFriendsStore.getState().sendRequest('existing@test.com');

        expect(result).toBe(false);
        expect(useFriendsStore.getState().error).toBe('Already friends');
    });

    it('acceptRequest refreshes friends and requests', async () => {
        vi.mocked(friendsApi.acceptRequest).mockResolvedValue({} as any);
        vi.mocked(friendsApi.list).mockResolvedValue({ data: { data: [mockFriend] } } as any);
        vi.mocked(friendsApi.getPendingRequests).mockResolvedValue({ data: { data: [] } } as any);

        const result = await useFriendsStore.getState().acceptRequest('r1');

        expect(result).toBe(true);
        expect(friendsApi.list).toHaveBeenCalled();
        expect(friendsApi.getPendingRequests).toHaveBeenCalled();
    });

    it('declineRequest refreshes pending requests', async () => {
        vi.mocked(friendsApi.declineRequest).mockResolvedValue({} as any);
        vi.mocked(friendsApi.getPendingRequests).mockResolvedValue({ data: { data: [] } } as any);

        const result = await useFriendsStore.getState().declineRequest('r1');

        expect(result).toBe(true);
        expect(friendsApi.getPendingRequests).toHaveBeenCalled();
    });

    it('removeFriend refreshes friends list', async () => {
        vi.mocked(friendsApi.removeFriend).mockResolvedValue({} as any);
        vi.mocked(friendsApi.list).mockResolvedValue({ data: { data: [] } } as any);

        const result = await useFriendsStore.getState().removeFriend('f1');

        expect(result).toBe(true);
        expect(friendsApi.list).toHaveBeenCalled();
    });

    it('removeFriend sets error on failure', async () => {
        vi.mocked(friendsApi.removeFriend).mockRejectedValue({
            response: { data: { error: { message: 'Not found' } } },
        });

        const result = await useFriendsStore.getState().removeFriend('f1');

        expect(result).toBe(false);
        expect(useFriendsStore.getState().error).toBe('Not found');
    });

    it('clearError clears the error', () => {
        useFriendsStore.setState({ error: 'some error' });
        useFriendsStore.getState().clearError();
        expect(useFriendsStore.getState().error).toBeNull();
    });
});
