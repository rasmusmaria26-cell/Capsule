import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ScrollView, SafeAreaView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { Colors, Typography, Spacing } from '../theme/tokens';
import { useProfileStore, ChowaProfile } from '../store/profileStore';
import { api } from '../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

const PROFILES: { id: ChowaProfile; label: string; description: string; emoji: string }[] = [
    {
        id: 'tonal_minimalist',
        label: 'Tonal Minimalist',
        emoji: '◻️',
        description: 'Soft, same-family tones. Quiet elegance.',
    },
    {
        id: 'contrast_bold',
        label: 'Contrast Bold',
        emoji: '◼️',
        description: 'Strong light/dark splits. High visual impact.',
    },
    {
        id: 'analogous_soft',
        label: 'Analogous Soft',
        emoji: '🎨',
        description: 'Neighboring hues. Harmonious without being matchy.',
    },
];

export default function OnboardingScreen({ navigation }: Props) {
    const [selected, setSelected] = useState<ChowaProfile>(null);
    const [loading, setLoading] = useState(false);
    const { setProfile, completeOnboarding } = useProfileStore();

    const handleConfirm = async () => {
        if (!selected) return;
        setLoading(true);
        try {
            await api.onboarding.submitProfile(selected);
            setProfile(selected);
            completeOnboarding();
        } catch (e) {
            // If API fails (dev mode), still proceed
            setProfile(selected);
            completeOnboarding();
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.heading}>What's your style?</Text>
                <Text style={styles.subheading}>
                    This shapes how Chowa ranks your outfits.{'\n'}You can always change it later.
                </Text>

                <View style={styles.cards}>
                    {PROFILES.map((p) => (
                        <TouchableOpacity
                            key={p.id}
                            style={[styles.card, selected === p.id && styles.cardSelected]}
                            onPress={() => setSelected(p.id)}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.cardEmoji}>{p.emoji}</Text>
                            <View style={styles.cardText}>
                                <Text style={styles.cardLabel}>{p.label}</Text>
                                <Text style={styles.cardDesc}>{p.description}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity
                    style={[styles.cta, !selected && styles.ctaDisabled]}
                    onPress={handleConfirm}
                    disabled={!selected || loading}
                    activeOpacity={0.85}
                >
                    <Text style={styles.ctaText}>{loading ? 'Saving…' : 'Start dressing'}</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    scroll: { padding: Spacing['2xl'], gap: Spacing.lg },
    heading: {
        fontFamily: 'Manrope_800ExtraBold',
        fontSize: Typography.sizes['2xl'],
        color: Colors.textPrimary,
        letterSpacing: -0.5,
    },
    subheading: {
        fontFamily: 'Manrope_400Regular',
        fontSize: Typography.sizes.base,
        color: Colors.textSecondary,
        lineHeight: Typography.sizes.base * 1.6,
    },
    cards: { gap: Spacing.md },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        backgroundColor: Colors.surfaceElevated,
        padding: Spacing.base,
        borderLeftWidth: 3,
        borderLeftColor: 'transparent',
    },
    cardSelected: { borderLeftColor: Colors.accent },
    cardEmoji: { fontSize: 28 },
    cardText: { flex: 1, gap: 4 },
    cardLabel: {
        fontFamily: 'Manrope_700Bold',
        fontSize: Typography.sizes.base,
        color: Colors.textPrimary,
    },
    cardDesc: {
        fontFamily: 'Manrope_400Regular',
        fontSize: Typography.sizes.sm,
        color: Colors.textSecondary,
    },
    cta: {
        backgroundColor: Colors.accent,
        padding: Spacing.base,
        alignItems: 'center',
        marginTop: Spacing.md,
    },
    ctaDisabled: { backgroundColor: Colors.accentLight },
    ctaText: {
        fontFamily: 'Manrope_700Bold',
        fontSize: Typography.sizes.base,
        color: Colors.textInverse,
    },
});
