import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    Image, SafeAreaView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { Colors, Typography, Spacing } from '../theme/tokens';
import { api } from '../services/api';
import { Garment } from '../store/wardrobeStore';

type Props = NativeStackScreenProps<RootStackParamList, 'ItemDetail'>;

function OKLCHRow({ label, value }: { label: string; value: number }) {
    return (
        <View style={styles.oklchRow}>
            <Text style={styles.oklchLabel}>{label}</Text>
            <Text style={styles.oklchValue}>{value.toFixed(2)}</Text>
        </View>
    );
}

export default function ItemDetailScreen({ route, navigation }: Props) {
    const { garmentId } = route.params;
    const [garment, setGarment] = useState<Garment | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.wardrobe.getItem(garmentId)
            .then((res) => setGarment(res.data.garment))
            .finally(() => setLoading(false));
    }, [garmentId]);

    if (loading) return <ActivityIndicator style={{ flex: 1 }} color={Colors.accent} />;
    if (!garment) return null;

    return (
        <SafeAreaView style={styles.container}>
            <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
                <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>

            <ScrollView contentContainerStyle={styles.scroll}>
                {garment.image_url ? (
                    <Image source={{ uri: garment.image_url }} style={styles.hero} resizeMode="cover" />
                ) : (
                    <View style={[styles.hero, { backgroundColor: garment.dominant_hex ?? Colors.surface }]} />
                )}

                <View style={styles.body}>
                    <Text style={styles.category}>{garment.category}</Text>
                    <Text style={styles.sub}>{garment.sub_category}</Text>

                    {!garment.is_confirmed && (
                        <View style={styles.reviewBanner}>
                            <Text style={styles.reviewText}>⚠ Review needed — confidence low</Text>
                        </View>
                    )}

                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>OKLCH Color Values</Text>
                        <View style={styles.oklchBlock}>
                            <View style={[styles.colorDot, { backgroundColor: garment.dominant_hex ?? '#ccc' }]} />
                            <View style={styles.oklchRows}>
                                <OKLCHRow label="L (Lightness)" value={garment.oklch_l} />
                                <OKLCHRow label="C (Chroma)" value={garment.oklch_c} />
                                <OKLCHRow label="H (Hue°)" value={garment.oklch_h} />
                            </View>
                        </View>
                    </View>

                    {garment.confidence !== null && (
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>AI Confidence</Text>
                            <Text style={styles.confidence}>{(garment.confidence * 100).toFixed(0)}%</Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    back: { padding: Spacing.base },
    backText: { fontFamily: 'Manrope_500Medium', fontSize: Typography.sizes.base, color: Colors.accent },
    scroll: { paddingBottom: Spacing['3xl'] },
    hero: { width: '100%', aspectRatio: 0.9 },
    body: { padding: Spacing['2xl'], gap: Spacing.xl },
    category: { fontFamily: 'Manrope_800ExtraBold', fontSize: Typography.sizes.xl, color: Colors.textPrimary },
    sub: { fontFamily: 'Manrope_400Regular', fontSize: Typography.sizes.md, color: Colors.textSecondary, marginTop: -Spacing.md },
    reviewBanner: { backgroundColor: Colors.accentLight, padding: Spacing.sm },
    reviewText: { fontFamily: 'Manrope_500Medium', fontSize: Typography.sizes.sm, color: Colors.accent },
    section: { gap: Spacing.sm },
    sectionLabel: { fontFamily: 'Manrope_600SemiBold', fontSize: Typography.sizes.xs, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 },
    oklchBlock: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
    colorDot: { width: 48, height: 48 },
    oklchRows: { flex: 1, gap: 4 },
    oklchRow: { flexDirection: 'row', justifyContent: 'space-between' },
    oklchLabel: { fontFamily: 'Manrope_400Regular', fontSize: Typography.sizes.sm, color: Colors.textSecondary },
    oklchValue: { fontFamily: 'Manrope_600SemiBold', fontSize: Typography.sizes.sm, color: Colors.textPrimary },
    confidence: { fontFamily: 'Manrope_700Bold', fontSize: Typography.sizes.xl, color: Colors.textPrimary },
});
