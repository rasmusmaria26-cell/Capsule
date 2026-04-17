import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { Colors, Typography, Spacing } from '../theme/tokens';
import { useProfileStore, ChowaProfile } from '../store/profileStore';
import { api } from '../services/api';

const PROFILE_INFO: Record<NonNullable<ChowaProfile>, { label: string; emoji: string }> = {
    tonal_minimalist: { label: 'Tonal Minimalist', emoji: '◻️' },
    contrast_bold: { label: 'Contrast Bold', emoji: '◼️' },
    analogous_soft: { label: 'Analogous Soft', emoji: '🎨' },
};

export default function ProfileScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { chowaProfile, email } = useProfileStore();

    const profileInfo = chowaProfile ? PROFILE_INFO[chowaProfile] : null;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.inner}>
                <Text style={styles.title}>Profile</Text>

                <View style={styles.card}>
                    <Text style={styles.email}>{email ?? '—'}</Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Chowa Profile</Text>
                    {profileInfo ? (
                        <View style={styles.profileRow}>
                            <Text style={styles.profileEmoji}>{profileInfo.emoji}</Text>
                            <Text style={styles.profileName}>{profileInfo.label}</Text>
                        </View>
                    ) : (
                        <Text style={styles.none}>Not set</Text>
                    )}
                    <TouchableOpacity onPress={() => navigation.navigate('Onboarding')}>
                        <Text style={styles.change}>Change profile →</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.settingsRow} onPress={() => navigation.navigate('Settings')}>
                    <Text style={styles.settingsText}>Settings</Text>
                    <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    inner: { flex: 1, padding: Spacing['2xl'], gap: Spacing.xl },
    title: { fontFamily: 'Manrope_800ExtraBold', fontSize: Typography.sizes.xl, color: Colors.textPrimary },
    card: { backgroundColor: Colors.surfaceElevated, padding: Spacing.base },
    email: { fontFamily: 'Manrope_400Regular', fontSize: Typography.sizes.base, color: Colors.textSecondary },
    section: { gap: Spacing.sm },
    sectionLabel: { fontFamily: 'Manrope_600SemiBold', fontSize: Typography.sizes.xs, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 },
    profileRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    profileEmoji: { fontSize: 24 },
    profileName: { fontFamily: 'Manrope_700Bold', fontSize: Typography.sizes.md, color: Colors.textPrimary },
    none: { fontFamily: 'Manrope_400Regular', fontSize: Typography.sizes.base, color: Colors.textTertiary },
    change: { fontFamily: 'Manrope_500Medium', fontSize: Typography.sizes.sm, color: Colors.accent },
    settingsRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: Colors.surfaceElevated, padding: Spacing.base },
    settingsText: { fontFamily: 'Manrope_500Medium', fontSize: Typography.sizes.base, color: Colors.textPrimary },
    chevron: { fontFamily: 'Manrope_400Regular', fontSize: Typography.sizes.lg, color: Colors.textTertiary },
});
