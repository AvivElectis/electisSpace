import { create } from 'zustand';
import type { Friend, FriendRequest } from '../domain/types';
import { friendsApi } from '../infrastructure/friendsApi';

interface FriendsState {
    friends: Friend[];
    pendingRequests: FriendRequest[];
    isLoading: boolean;
    error: string | null;
}

interface FriendsActions {
    fetchFriends: () => Promise<void>;
    fetchFriendLocations: () => Promise<void>;
    fetchPendingRequests: () => Promise<void>;
    sendRequest: (email: string) => Promise<boolean>;
    acceptRequest: (friendshipId: string) => Promise<boolean>;
    declineRequest: (friendshipId: string) => Promise<boolean>;
    removeFriend: (friendshipId: string) => Promise<boolean>;
    clearError: () => void;
}

export const useFriendsStore = create<FriendsState & FriendsActions>((set, get) => ({
    friends: [],
    pendingRequests: [],
    isLoading: false,
    error: null,

    fetchFriends: async () => {
        set({ isLoading: true, error: null });
        try {
            const { data } = await friendsApi.list();
            set({ friends: data.friends, isLoading: false });
        } catch (error: any) {
            set({
                error: error?.response?.data?.error?.message || 'Failed to load friends',
                isLoading: false,
            });
        }
    },

    fetchFriendLocations: async () => {
        try {
            const { data } = await friendsApi.getLocations();
            set({ friends: data.friends });
        } catch {
            // Silently fail
        }
    },

    fetchPendingRequests: async () => {
        try {
            const { data } = await friendsApi.getPendingRequests();
            set({ pendingRequests: data.requests });
        } catch {
            // Silently fail
        }
    },

    sendRequest: async (email) => {
        set({ error: null });
        try {
            await friendsApi.sendRequest(email);
            return true;
        } catch (error: any) {
            set({ error: error?.response?.data?.error?.message || 'Failed to send request' });
            return false;
        }
    },

    acceptRequest: async (friendshipId) => {
        set({ error: null });
        try {
            await friendsApi.acceptRequest(friendshipId);
            get().fetchFriends();
            get().fetchPendingRequests();
            return true;
        } catch (error: any) {
            set({ error: error?.response?.data?.error?.message || 'Failed to accept request' });
            return false;
        }
    },

    declineRequest: async (friendshipId) => {
        set({ error: null });
        try {
            await friendsApi.declineRequest(friendshipId);
            get().fetchPendingRequests();
            return true;
        } catch (error: any) {
            set({ error: error?.response?.data?.error?.message || 'Failed to decline request' });
            return false;
        }
    },

    removeFriend: async (friendshipId) => {
        set({ error: null });
        try {
            await friendsApi.removeFriend(friendshipId);
            get().fetchFriends();
            return true;
        } catch (error: any) {
            set({ error: error?.response?.data?.error?.message || 'Failed to remove friend' });
            return false;
        }
    },

    clearError: () => set({ error: null }),
}));
