import { create } from 'zustand';

export type ChowaProfile = 'tonal_minimalist' | 'contrast_bold' | 'analogous_soft' | null;

interface ProfileState {
    isAuthenticated: boolean;
    isOnboarded: boolean;
    userId: string | null;
    token: string | null;
    chowaProfile: ChowaProfile;
    email: string | null;

    // Actions
    setAuth: (userId: string, token: string, email: string) => void;
    setProfile: (profile: ChowaProfile) => void;
    completeOnboarding: () => void;
    logout: () => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
    isAuthenticated: false,
    isOnboarded: false,
    userId: null,
    token: null,
    chowaProfile: null,
    email: null,

    setAuth: (userId, token, email) =>
        set({ isAuthenticated: true, userId, token, email }),

    setProfile: (profile) =>
        set({ chowaProfile: profile }),

    completeOnboarding: () =>
        set({ isOnboarded: true }),

    logout: () =>
        set({
            isAuthenticated: false,
            isOnboarded: false,
            userId: null,
            token: null,
            chowaProfile: null,
            email: null,
        }),
}));
