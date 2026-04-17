import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ScrollView, SafeAreaView, Image,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { Colors, Typography, Spacing, Shadow } from '../theme/tokens';
import { useWardrobeStore, GeneratedOutfit } from '../store/wardrobeStore';
import { api } from '../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'OutfitResult'>;

function ScoreBadge({ score }: { score: number }) {
    const color =
        score >= 90 ? Colors.score90 :
            score >= 75 ? Colors.score75 :
                score >= 60 ? Colors.score60 : Colors.scoreLow;

    return (
        <View style={[styles.scoreBadge, { backgroundColor: color }]}>
            <Text style={styles.scoreText}>{score}</Text>
        </View>
    );
}

export default function OutfitResultScreen({ route, navigation }: Props) {
    const { occasion, weather } = route.params;
    const outfits = useWardrobeStore((s) => s.lastGeneratedOutfits);
    const [accepted, setAccepted] = useState<string | null>(null);

    const handleAction = async (outfitId: string, action: 'worn' | 'rejected') => {
        setAccepted(outfitId);
        await api.telemetry.log(outfitId, action);
        if (action === 'worn') navigation.goBack();
    };

    if (!outfits.length) {
        return (
            <SafeAreaView style={styles.container}>
                <Text style={styles.empty}>No outfits generated yet.</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>{occasion} · {weather}</Text>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.back}>✕</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {outfits.map((outfit: GeneratedOutfit) => (
                    <View key={outfit.outfit_id} style={styles.card}>
                        {outfit.is_partial_style && (
                            <View style={styles.partialBanner}>
                                <Text style={styles.partialText}>⚠ Partial style — add more items</Text>
                            </View>
                        )}

                        <View style={styles.cardHeader}>
                            <Text style={styles.rank}>#{outfit.rank}</Text>
                            <ScoreBadge score={Math.round(outfit.final_score)} />
                        </View>

                        {/* Garment tiles */}
                        <View style={styles.items}>
                            {['top', 'outerwear', 'bottom', 'shoes'].map((slot) => {
                                const item = outfit.items[slot as keyof typeof outfit.items];
                                if (!item) return null;
                                return (
                                    <View key={slot} style={styles.itemRow}>
                                        {item.image_url ? (
                                            <Image source={{ uri: item.image_url }} style={styles.itemThumb} />
                                        ) : (
                                            <View style={[styles.itemThumb, { backgroundColor: item.dominant_hex ?? Colors.surface }]} />
                                        )}
                                        <View>
                                            <Text style={styles.itemCat}>{slot.charAt(0).toUpperCase() + slot.slice(1)}</Text>
                                            <Text style={styles.itemSub}>{item.sub_category}</Text>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>

                        <View style={styles.actions}>
                            <TouchableOpacity
                                style={styles.wearBtn}
                                onPress={() => handleAction(outfit.outfit_id, 'worn')}
                            >
                                <Text style={styles.wearBtnText}>Wear this</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.skipBtn}
                                onPress={() => handleAction(outfit.outfit_id, 'rejected')}
                            >
                                <Text style={styles.skipBtnText}>Skip</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: Spacing['2xl'], paddingBottom: Spacing.base,
    },
    title: { fontFamily: 'Manrope_700Bold', fontSize: Typography.sizes.md, color: Colors.textPrimary },
    back: { fontFamily: 'Manrope_400Regular', fontSize: Typography.sizes.lg, color: Colors.textSecondary },
    scroll: { padding: Spacing.base, gap: Spacing.md },
    card: { backgroundColor: Colors.surfaceElevated, ...Shadow.card },
    partialBanner: { backgroundColor: Colors.accentLight, padding: Spacing.sm },
    partialText: { fontFamily: 'Manrope_500Medium', fontSize: Typography.sizes.xs, color: Colors.accent },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.base },
    rank: { fontFamily: 'Manrope_800ExtraBold', fontSize: Typography.sizes.lg, color: Colors.textTertiary },
    scoreBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
    scoreText: { fontFamily: 'Manrope_700Bold', fontSize: Typography.sizes.sm, color: '#FFF' },
    items: { paddingHorizontal: Spacing.base, gap: Spacing.sm },
    itemRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    itemThumb: { width: 48, height: 48 },
    itemCat: { fontFamily: 'Manrope_600SemiBold', fontSize: Typography.sizes.sm, color: Colors.textPrimary },
    itemSub: { fontFamily: 'Manrope_400Regular', fontSize: Typography.sizes.xs, color: Colors.textSecondary },
    actions: { flexDirection: 'row', padding: Spacing.base, gap: Spacing.sm, marginTop: Spacing.sm },
    wearBtn: { flex: 1, backgroundColor: Colors.textPrimary, padding: Spacing.sm, alignItems: 'center' },
    wearBtnText: { fontFamily: 'Manrope_700Bold', fontSize: Typography.sizes.sm, color: Colors.textInverse },
    skipBtn: { flex: 1, backgroundColor: Colors.surface, padding: Spacing.sm, alignItems: 'center' },
    skipBtnText: { fontFamily: 'Manrope_500Medium', fontSize: Typography.sizes.sm, color: Colors.textSecondary },
    empty: { fontFamily: 'Manrope_400Regular', fontSize: Typography.sizes.base, color: Colors.textSecondary, textAlign: 'center', marginTop: 80 },
});
