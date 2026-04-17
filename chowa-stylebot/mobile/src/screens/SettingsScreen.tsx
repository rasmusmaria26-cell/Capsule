import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors, Typography, Spacing } from '../theme/tokens';
import { useProfileStore } from '../store/profileStore';

export default function SettingsScreen() {
    const navigation = useNavigation();
    const logout = useProfileStore((s) => s.logout);

    const handleLogout = () => {
        Alert.alert('Log out', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Log out', style: 'destructive', onPress: logout },
        ]);
    };

    const rows = [
        { label: 'Notifications', onPress: () => { } },
        { label: 'Privacy Policy', onPress: () => { } },
        { label: 'Terms of Service', onPress: () => { } },
        { label: 'About Chowa', onPress: () => { } },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.inner}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.back}>← Back</Text>
                </TouchableOpacity>

                <Text style={styles.title}>Settings</Text>

                <View style={styles.list}>
                    {rows.map((r, i) => (
                        <TouchableOpacity key={i} style={styles.row} onPress={r.onPress} activeOpacity={0.7}>
                            <Text style={styles.rowLabel}>{r.label}</Text>
                            <Text style={styles.chevron}>›</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <Text style={styles.logoutText}>Log out</Text>
                </TouchableOpacity>

                <Text style={styles.version}>Chowa StyleBot v1.0.0</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    inner: { flex: 1, padding: Spacing['2xl'], gap: Spacing.xl },
    back: { fontFamily: 'Manrope_500Medium', fontSize: Typography.sizes.base, color: Colors.accent },
    title: { fontFamily: 'Manrope_800ExtraBold', fontSize: Typography.sizes.xl, color: Colors.textPrimary },
    list: { gap: 1 },
    row: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: Colors.surfaceElevated, padding: Spacing.base },
    rowLabel: { fontFamily: 'Manrope_500Medium', fontSize: Typography.sizes.base, color: Colors.textPrimary },
    chevron: { fontFamily: 'Manrope_400Regular', fontSize: Typography.sizes.lg, color: Colors.textTertiary },
    logoutBtn: { backgroundColor: Colors.error, padding: Spacing.base, alignItems: 'center', marginTop: 'auto' },
    logoutText: { fontFamily: 'Manrope_700Bold', fontSize: Typography.sizes.base, color: Colors.textInverse },
    version: { fontFamily: 'Manrope_400Regular', fontSize: Typography.sizes.xs, color: Colors.textTertiary, textAlign: 'center' },
});
