import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    SafeAreaView, ActivityIndicator, ScrollView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { useWardrobeStore } from '../store/wardrobeStore';
import { api } from '../services/api';
import { fetchRawWeather } from '../services/weatherApi';

const OCCASIONS = [
    { id: 'casual', label: 'Casual', helper: 'Everyday', icon: '☕' },
    { id: 'work', label: 'Work', helper: 'Office', icon: '💼' },
    { id: 'night_out', label: 'Night Out', helper: 'Sleek', icon: '🌙' },
    { id: 'active', label: 'Active', helper: 'Sport', icon: '🏃' },
    { id: 'formal', label: 'Formal', helper: 'Events', icon: '🎉' },
    { id: 'travel', label: 'Travel', helper: 'Comfort', icon: '✈️' },
] as const;

export default function DailyCheckInScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const [occasion, setOccasion] = useState<string>(OCCASIONS[2].id);
    const [weatherLabel, setWeatherLabel] = useState<string>('hot');

    // UI states
    const [location, setLocation] = useState('Fetching...');
    const [weatherSub, setWeatherSub] = useState('Loading...');
    const [temp, setTemp] = useState('--');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchW = async () => {
            const data = await fetchRawWeather();
            setWeatherLabel(data.condition);
            setLocation(data.locationName);
            setWeatherSub(data.description);
            setTemp(data.temperature.toString());
        };
        fetchW();
    }, []);

    const { setGeneratedOutfits, setLoading: setStoreLoading, garments } = useWardrobeStore();

    const handleGenerate = async () => {
        setLoading(true);
        setStoreLoading(true);
        try {
            const res = await api.outfit.generate(occasion, weatherLabel);
            setGeneratedOutfits(res.data.generated_outfits);
            navigation.navigate('OutfitResult', { occasion, weather: weatherLabel });
        } catch (e: any) {
            alert(e?.response?.data?.detail || e.message || 'Generation failed');
        } finally {
            setLoading(false);
            setStoreLoading(false);
        }
    };

    // Calculate filter stats
    const totalGarments = garments.length || 12;
    const keptGarments = Math.max(4, totalGarments - 2);
    const filterPct = Math.round((keptGarments / totalGarments) * 100);

    const todayDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).replace(',', ' ·');

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                    {/* Greeting */}
                    <View style={styles.greet}>
                        <Text style={styles.greetSub}>{todayDate}</Text>
                        <Text style={styles.greetTitle}>What's{'\n'}the <Text style={styles.greetItalic}>plan?</Text></Text>
                    </View>

                    {/* Weather Card */}
                    <View style={styles.wcard}>
                        <View style={styles.wleft}>
                            <View style={styles.wicon}>
                                <Text style={{ fontSize: 24 }}>☀️</Text>
                            </View>
                            <View>
                                <Text style={styles.wlabel}>{location}</Text>
                                <Text style={styles.wval}>Feeling {weatherLabel.charAt(0).toUpperCase() + weatherLabel.slice(1)}</Text>
                                <Text style={styles.wsub}>{weatherSub}</Text>
                            </View>
                        </View>
                        <Text style={styles.temp}>{temp}<Text style={styles.tempSpan}>°C</Text></Text>
                    </View>

                    {/* Occasion Grid */}
                    <Text style={styles.secLbl}>What's the occasion?</Text>
                    <View style={styles.occGrid}>
                        {OCCASIONS.map(o => (
                            <TouchableOpacity
                                key={o.id}
                                style={[styles.occ, occasion === o.id && styles.occOn]}
                                onPress={() => setOccasion(o.id)}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.occIco}>{o.icon}</Text>
                                <Text style={[styles.occN, occasion === o.id && styles.occNOn]}>{o.label}</Text>
                                <Text style={[styles.occH, occasion === o.id && styles.occHOn]}>{o.helper}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Filter Preview */}
                    <View style={styles.fpreview}>
                        <View style={styles.fpRow}>
                            <Text style={styles.fpT}>Wardrobe after filter</Text>
                            <Text style={styles.fpC}>{keptGarments} of {totalGarments} pieces</Text>
                        </View>
                        <View style={styles.fpBg}>
                            <View style={[styles.fpFill, { width: `${filterPct}%` }]} />
                        </View>
                        <View style={styles.fpTags}>
                            <View style={styles.ftag}><Text style={styles.ftagText}>✓ Jackets kept</Text></View>
                            <View style={styles.ftag}><Text style={styles.ftagText}>✓ Trousers kept</Text></View>
                            <View style={[styles.ftag, styles.ftagR]}><Text style={[styles.ftagText, styles.ftagTextR]}>✗ Winter coats out</Text></View>
                        </View>
                    </View>

                    {/* CTA */}
                    <TouchableOpacity style={styles.cta} onPress={handleGenerate} disabled={loading} activeOpacity={0.85}>
                        {loading ? <ActivityIndicator color="#FAFAF8" /> : <Text style={styles.ctaText}>Generate Outfits ✦</Text>}
                    </TouchableOpacity>
                    <Text style={styles.ctaSub}>Chowa engine ranks by OKLCH color harmony</Text>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F1EA' },
    safeArea: { flex: 1 },
    scroll: { paddingHorizontal: 22, paddingBottom: 32 },

    greet: { paddingTop: 28, marginBottom: 22 },
    greetSub: { fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', color: '#AAA', marginBottom: 8, fontFamily: 'System' },
    greetTitle: { fontFamily: 'Georgia', fontSize: 42, color: '#1a1a1a', letterSpacing: -0.5, lineHeight: 46 },
    greetItalic: { fontStyle: 'italic', color: '#8C6D4F' },

    wcard: {
        backgroundColor: '#fff', borderRadius: 22, paddingVertical: 16, paddingHorizontal: 18,
        marginBottom: 10, borderColor: '#EDE8DF', borderWidth: 1,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'
    },
    wleft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    wicon: { width: 50, height: 50, borderRadius: 14, backgroundColor: '#f4ba61', alignItems: 'center', justifyContent: 'center' },
    wlabel: { fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', color: '#AAA', marginBottom: 3 },
    wval: { fontSize: 16, fontWeight: '500', color: '#1a1a1a' },
    wsub: { fontSize: 10, color: '#AAA', marginTop: 1 },
    temp: { fontFamily: 'Georgia', fontSize: 36, color: '#1a1a1a' },
    tempSpan: { fontSize: 14, color: '#AAA' },

    overrideRow: { flexDirection: 'row', gap: 6, marginBottom: 24, flexWrap: 'wrap' },
    ov: { backgroundColor: '#F0EBE3', borderRadius: 20, paddingVertical: 5, paddingHorizontal: 13, borderColor: 'transparent', borderWidth: 1 },
    ovOn: { backgroundColor: '#8C6D4F' },
    ovText: { fontSize: 11, color: '#8C6D4F' },
    ovTextOn: { color: '#fff' },

    secLbl: { fontSize: 9, letterSpacing: 1.8, textTransform: 'uppercase', color: '#BBB', marginBottom: 12 },
    occGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 22, justifyContent: 'space-between' },
    occ: {
        backgroundColor: '#fff', borderRadius: 18, paddingVertical: 14, paddingHorizontal: 8,
        alignItems: 'center', borderColor: 'transparent', borderWidth: 1.5, width: '31%'
    },
    occOn: { backgroundColor: '#1a1a1a', borderColor: '#1a1a1a' },
    occIco: { fontSize: 22, marginBottom: 6 },
    occN: { fontSize: 11, fontWeight: '500', color: '#1a1a1a', marginBottom: 1 },
    occNOn: { color: '#fff' },
    occH: { fontSize: 8, color: '#CCC', letterSpacing: 0.2 },
    occHOn: { color: 'rgba(255,255,255,0.4)' },

    fpreview: { backgroundColor: '#fff', borderRadius: 18, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 20, borderColor: '#EDE8DF', borderWidth: 1 },
    fpRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    fpT: { fontSize: 11, fontWeight: '500', color: '#1a1a1a' },
    fpC: { fontSize: 11, color: '#8C6D4F' },
    fpBg: { height: 4, backgroundColor: '#F0EBE3', borderRadius: 4, overflow: 'hidden' },
    fpFill: { height: '100%', backgroundColor: '#8C6D4F', borderRadius: 4 },
    fpTags: { flexDirection: 'row', gap: 5, marginTop: 10, flexWrap: 'wrap' },
    ftag: { backgroundColor: '#F5F0E8', borderRadius: 20, paddingVertical: 3, paddingHorizontal: 10 },
    ftagR: { backgroundColor: '#FFF0F0' },
    ftagText: { fontSize: 9, color: '#8C6D4F', letterSpacing: 0.2 },
    ftagTextR: { color: '#C05050' },

    cta: {
        width: '100%', backgroundColor: '#1a1a1a', borderRadius: 18, padding: 17,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center'
    },
    ctaText: { fontSize: 14, fontWeight: '500', color: '#FAFAF8', letterSpacing: 0.3 },
    ctaSub: { fontSize: 9, color: '#BBB', textAlign: 'center', marginTop: 8, letterSpacing: 0.3 }
});
