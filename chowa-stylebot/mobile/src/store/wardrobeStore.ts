import { create } from 'zustand';

export interface Garment {
    garment_id: string;
    category: string;
    sub_category: string;
    dominant_hex: string | null;
    secondary_hex: string | null;
    oklch_l: number;
    oklch_c: number;
    oklch_h: number;
    image_url: string | null;
    is_confirmed: boolean;
    confidence: number | null;
    all_labels?: string[];
}

export interface GeneratedOutfit {
    outfit_id: string;
    rank: number;
    final_score: number;
    is_partial_style: boolean;
    items: {
        top: Garment | null;
        bottom: Garment | null;
        shoes: Garment | null;
        outerwear?: Garment | null;
    };
    telemetry: Record<string, number>;
}

interface WardrobeState {
    garments: Garment[];
    lastGeneratedOutfits: GeneratedOutfit[];
    isLoading: boolean;

    // Actions
    setGarments: (garments: Garment[]) => void;
    addGarment: (garment: Garment) => void;
    confirmGarment: (garmentId: string) => void;
    setGeneratedOutfits: (outfits: GeneratedOutfit[]) => void;
    setLoading: (loading: boolean) => void;
}

export const useWardrobeStore = create<WardrobeState>((set) => ({
    garments: [],
    lastGeneratedOutfits: [],
    isLoading: false,

    setGarments: (garments) => set({ garments }),

    addGarment: (garment) =>
        set((state) => ({ garments: [...state.garments, garment] })),

    confirmGarment: (garmentId) =>
        set((state) => ({
            garments: state.garments.map((g) =>
                g.garment_id === garmentId ? { ...g, is_confirmed: true } : g
            ),
        })),

    setGeneratedOutfits: (outfits) => set({ lastGeneratedOutfits: outfits }),

    setLoading: (loading) => set({ isLoading: loading }),
}));
