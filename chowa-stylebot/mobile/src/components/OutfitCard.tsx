import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Colors, Typography, Spacing, Shadow } from '../theme/tokens';
import { GeneratedOutfit, Garment } from '../store/wardrobeStore';

interface Props {
    outfit: GeneratedOutfit;
    onWear?: (id: string) => void;
    onSkip?: (id: string) => void;
}

export default function OutfitCard({ outfit, onWear, onSkip }: Props) {
    const scoreBadgeColor =
        outfit.final_score >= 90 ? Colors.score90 :
            outfit.final_score >= 75 ? Colors.score75 :
                outfit.final_score >= 60 ? Colors.score60 : Colors.scoreLow;

    const renderSlot = (slotName: string, item: Garment | null) => {
        if (!item) return null;
        return (
            <View key={slotName} style={styles.itemRow}>
                <View style={[styles.thumb, { backgroundColor: item.dominant_hex ?? Colors.surface }]}>
                    {item.image_url && <Image source={{ uri: item.image_url }} style={styles.thumbImage} resizeMode="cover" />}
                </View>
                <View style={styles.itemInfo}>
                    <Text style={styles.itemCategory}>{slotName.charAt(0).toUpperCase() + slotName.slice(1)}</Text>
                    <Text style={styles.itemSub}>{item.sub_category}</Text>
                </View>
                <View style={[styles.swatch, { backgroundColor: item.dominant_hex ?? Colors.surface }]} />
            </View>
        );
    };

    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <Text style={styles.rank}>#{outfit.rank}</Text>
                <View style={[styles.badge, { backgroundColor: scoreBadgeColor }]}>
                    <Text style={styles.badgeText}>{Math.round(outfit.final_score)}</Text>
                </View>
            </View>

            <View style={styles.items}>
                {renderSlot('outerwear', outfit.items.outerwear)}
                {renderSlot('top', outfit.items.top)}
                {renderSlot('bottom', outfit.items.bottom)}
                {renderSlot('shoes', outfit.items.shoes)}
            </View>

            {(onWear || onSkip) && (
                <View style={styles.actions}>
                    {onWear && (
                        <TouchableOpacity style={styles.wearBtn} onPress={() => onWear(outfit.outfit_id)} activeOpacity={0.8}>
                            <Text style={styles.wearBtnText}>Wear this</Text>
                        </TouchableOpacity>
                    )}
                    {onSkip && (
                        <TouchableOpacity style={styles.skipBtn} onPress={() => onSkip(outfit.outfit_id)} activeOpacity={0.8}>
                            <Text style={styles.skipBtnText}>Skip</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.surfaceElevated,
        padding: Spacing.base,
        gap: Spacing.md,
        ...Shadow.card,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    rank: {
        fontFamily: 'Manrope_800ExtraBold',
        fontSize: Typography.sizes.lg,
        color: Colors.textTertiary,
    },
    badge: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: 999,
    },
    badgeText: {
        fontFamily: 'Manrope_700Bold',
        fontSize: Typography.sizes.sm,
        color: '#FFF',
    },
    items: {
        gap: Spacing.sm,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    thumb: {
        width: 48,
        height: 48,
        backgroundColor: Colors.surface,
    },
    thumbImage: {
        width: '100%',
        height: '100%',
    },
    itemInfo: {
        flex: 1,
    },
    itemCategory: {
        fontFamily: 'Manrope_600SemiBold',
        fontSize: Typography.sizes.sm,
        color: Colors.textPrimary,
    },
    itemSub: {
        fontFamily: 'Manrope_400Regular',
        fontSize: Typography.sizes.xs,
        color: Colors.textSecondary,
    },
    swatch: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.swatchBorder,
    },
    actions: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginTop: Spacing.xs,
    },
    wearBtn: {
        flex: 1,
        backgroundColor: Colors.textPrimary,
        padding: Spacing.sm,
        alignItems: 'center',
    },
    wearBtnText: {
        fontFamily: 'Manrope_700Bold',
        fontSize: Typography.sizes.sm,
        color: Colors.textInverse,
    },
    skipBtn: {
        flex: 1,
        backgroundColor: Colors.surface,
        padding: Spacing.sm,
        alignItems: 'center',
    },
    skipBtnText: {
        fontFamily: 'Manrope_500Medium',
        fontSize: Typography.sizes.sm,
        color: Colors.textSecondary,
    },
});
