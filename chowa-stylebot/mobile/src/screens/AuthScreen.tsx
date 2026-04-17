import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, SafeAreaView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { Colors, Typography, Spacing } from '../theme/tokens';
import { useProfileStore } from '../store/profileStore';

type Props = NativeStackScreenProps<RootStackParamList, 'Auth'>;

export default function AuthScreen({ navigation }: Props) {
    const [loading, setLoading] = useState(false);
    const setAuth = useProfileStore((s) => s.setAuth);

    const handleGoogleSignIn = async () => {
        setLoading(true);
        try {
            // TODO Phase 5: Wire up real Google OAuth / Supabase Auth
            // For now, simulate a successful login for development
            await new Promise((r) => setTimeout(r, 800));
            setAuth('dev-user-001', 'dev-token-xyz', 'dev@chowa.app');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.inner}>
                <View style={styles.brandBlock}>
                    <Text style={styles.logo}>✦</Text>
                    <Text style={styles.brand}>Chowa</Text>
                    <Text style={styles.tagline}>Dress with harmony.</Text>
                </View>

                <View style={styles.actions}>
                    <TouchableOpacity
                        style={styles.googleBtn}
                        onPress={handleGoogleSignIn}
                        disabled={loading}
                        activeOpacity={0.85}
                    >
                        {loading ? (
                            <ActivityIndicator color={Colors.textPrimary} />
                        ) : (
                            <Text style={styles.googleBtnText}>Continue with Google</Text>
                        )}
                    </TouchableOpacity>
                    <Text style={styles.terms}>
                        By continuing you agree to our Terms & Privacy Policy.
                    </Text>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    inner: {
        flex: 1,
        paddingHorizontal: Spacing['2xl'],
        justifyContent: 'space-between',
        paddingVertical: Spacing['3xl'],
    },
    brandBlock: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.sm },
    logo: { fontSize: 48, color: Colors.accent },
    brand: {
        fontFamily: 'Manrope_800ExtraBold',
        fontSize: Typography.sizes['3xl'],
        color: Colors.textPrimary,
        letterSpacing: -1,
    },
    tagline: {
        fontFamily: 'Manrope_400Regular',
        fontSize: Typography.sizes.md,
        color: Colors.textSecondary,
    },
    actions: { gap: Spacing.md },
    googleBtn: {
        backgroundColor: Colors.surfaceElevated,
        paddingVertical: Spacing.base,
        alignItems: 'center',
        borderRadius: 0,    // 0px radius rule
    },
    googleBtnText: {
        fontFamily: 'Manrope_600SemiBold',
        fontSize: Typography.sizes.base,
        color: Colors.textPrimary,
    },
    terms: {
        fontFamily: 'Manrope_400Regular',
        fontSize: Typography.sizes.xs,
        color: Colors.textTertiary,
        textAlign: 'center',
    },
});
