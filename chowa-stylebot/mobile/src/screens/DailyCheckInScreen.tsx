import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    SafeAreaView, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { Colors, Typography, Spacing } from '../theme/tokens';
import { useWardrobeStore } from '../store/wardrobeStore';
import { api } from '../services/api';
import { getWeatherCondition } from '../services/weatherApi';

const OCCASIONS = ['casual', 'work', 'night_out'] as const;
type Occasion = typeof OCCASIONS[number];

const OCCASION_LABELS: Record<Occasion, string> = {
    casual: 'Casual Day',
    work: 'Work',
    night_out: 'Night Out',
};

const WEATHER_ICONS: Record<string, string> = {
    hot: '☀️',
    mild: '🌤',
    cold: '🧥',
};

export default function DailyCheckInScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const [occasion, setOccasion] = useState<Occasion>('casual');
    const [weatherLabel, setWeatherLabel] = useState('mild');
    const [loading, setLoading] = useState(false);
    const { setGeneratedOutfits, setLoading: setStoreLoading } = useWardrobeStore();

    const fetchWeather = async () => {
        const w = await getWeatherCondition();
        setWeatherLabel(w);
    };

    React.useEffect(() => { fetchWeather(); }, []);

    const handleGenerate = async () => {
        setLoading(true);
        setStoreLoading(true);
        try {
            const res = await api.outfit.generate(occasion, weatherLabel);
            setGeneratedOutfits(res.data.generated_outfits);
            navigation.navigate('OutfitResult', { occasion, weather: weatherLabel });
        } catch (e) {
            // TODO: Show error toast
        } finally {
            setLoading(false);
            setStoreLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.inner}>
                <View>
                    <Text style={styles.greeting}>What's today?</Text>
                    <Text style={styles.weather}>
                        {WEATHER_ICONS[weatherLabel] ?? '🌤'} Feeling {weatherLabel}
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.label}>Occasion</Text>
                    <View style={styles.chips}>
                        {OCCASIONS.map((o) => (
                            <TouchableOpacity
                                key={o}
                                style={[styles.chip, occasion === o && styles.chipActive]}
                                onPress={() => setOccasion(o)}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.chipText, occasion === o && styles.chipTextActive]}>
                                    {OCCASION_LABELS[o]}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.cta}
                    onPress={handleGenerate}
                    disabled={loading}
                    activeOpacity={0.85}
                >
                    {loading ? (
                        <ActivityIndicator color={Colors.textInverse} />
                    ) : (
                        <Text style={styles.ctaText}>Generate outfits</Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    inner: { flex: 1, padding: Spacing['2xl'], justifyContent: 'space-between' },
    greeting: {
        fontFamily: 'Manrope_800ExtraBold',
        fontSize: Typography.sizes['2xl'],
        color: Colors.textPrimary,
        letterSpacing: -0.5,
    },
    weather: {
        fontFamily: 'Manrope_400Regular',
        fontSize: Typography.sizes.base,
        color: Colors.textSecondary,
        marginTop: Spacing.xs,
    },
    section: { gap: Spacing.md },
    label: {
        fontFamily: 'Manrope_600SemiBold',
        fontSize: Typography.sizes.sm,
        color: Colors.textTertiary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    chip: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        backgroundColor: Colors.surface,
    },
    chipActive: { backgroundColor: Colors.textPrimary },
    chipText: {
        fontFamily: 'Manrope_500Medium',
        fontSize: Typography.sizes.sm,
        color: Colors.textSecondary,
    },
    chipTextActive: { color: Colors.textInverse },
    cta: {
        backgroundColor: Colors.accent,
        padding: Spacing.base,
        alignItems: 'center',
    },
    ctaText: {
        fontFamily: 'Manrope_700Bold',
        fontSize: Typography.sizes.base,
        color: Colors.textInverse,
    },
});
