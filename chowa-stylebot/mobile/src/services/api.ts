import axios from 'axios';
import { useProfileStore } from '../store/profileStore';

// ── Config ─────────────────────────────────────────────────────────────────
// Update this to your local IP when running the FastAPI server locally
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:8000';

const client = axios.create({
    baseURL: BASE_URL,
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
});

// Inject auth token on every request
client.interceptors.request.use((config) => {
    const token = useProfileStore.getState().token;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// ── Onboarding ─────────────────────────────────────────────────────────────
export const api = {
    auth: {
        login: (username: string) => {
            const params = new URLSearchParams();
            params.append('username', username);
            params.append('password', 'dummy-pass-for-mvp');
            return client.post('/auth/token', params.toString(), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });
        }
    },

    onboarding: {
        submitProfile: (profile: string) =>
            client.post('/onboarding/profile', { chowa_profile: profile }),
    },

    // ── Wardrobe ──────────────────────────────────────────────────────────────
    wardrobe: {
        getAll: () => client.get('/wardrobe/'),

        upload: (formData: FormData) =>
            client.post('/wardrobe/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 30000, // Vision API can be slow
            }),

        confirmItem: (garmentId: string) =>
            client.post(`/wardrobe/${garmentId}/confirm`),

        getItem: (garmentId: string) =>
            client.get(`/wardrobe/${garmentId}`),

        deleteItem: (garmentId: string) =>
            client.delete(`/wardrobe/${garmentId}`),
    },

    // ── Outfit Generation ─────────────────────────────────────────────────────
    outfit: {
        generate: (occasion: string, weather: string) =>
            client.post('/outfit/generate', { occasion, weather }),
    },

    // ── Telemetry ─────────────────────────────────────────────────────────────
    telemetry: {
        log: (outfitId: string, action: 'worn' | 'rejected' | 'favorited', notes?: string) =>
            client.post('/telemetry/log', {
                outfit_id: outfitId,
                action,
                feedback_notes: notes,
            }),
    },
};
