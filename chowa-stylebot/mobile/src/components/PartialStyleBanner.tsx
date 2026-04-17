import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing } from '../theme/tokens';

interface Props {
    isVisible: boolean;
}

export default function PartialStyleBanner({ isVisible }: Props) {
    if (!isVisible) return null;

    return (
        <View style={styles.banner}>
            <Text style={styles.icon}>⚠</Text>
            <View style={styles.textContainer}>
                <Text style={styles.title}>Partial Style</Text>
                <Text style={styles.desc}>
                    Since you are missing a core category, we substituted it to generate this outfit.
                    Add more items to your wardrobe for full outfits.
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    banner: {
        flexDirection: 'row',
        backgroundColor: Colors.accentLight,
        padding: Spacing.base,
        gap: Spacing.sm,
        alignItems: 'flex-start',
    },
    icon: {
        fontSize: 18,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontFamily: 'Manrope_700Bold',
        fontSize: Typography.sizes.sm,
        color: Colors.accentDark,
    },
    desc: {
        fontFamily: 'Manrope_500Medium',
        fontSize: Typography.sizes.xs,
        color: Colors.accentDark,
        marginTop: 2,
        lineHeight: 16,
    },
});
