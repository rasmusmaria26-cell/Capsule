import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    Image, TouchableOpacity, ActivityIndicator, Dimensions, SafeAreaView, Platform
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { Colors } from '../theme/tokens';
import { api } from '../services/api';
import { Garment } from '../store/wardrobeStore';

type Props = NativeStackScreenProps<RootStackParamList, 'ItemDetail'>;

const { height } = Dimensions.get('window');

export default function ItemDetailScreen({ route, navigation }: Props) {
    const { garmentId } = route.params;
    const [garment, setGarment] = useState<Garment | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.wardrobe.getItem(garmentId)
            .then((res) => setGarment(res.data.garment))
            .finally(() => setLoading(false));
    }, [garmentId]);

    if (loading) return <View style={styles.center}><ActivityIndicator color="#8C6D4F" /></View>;
    if (!garment) return null;

    return (
        <View style={styles.container}>
            <ScrollView style={styles.inner} showsVerticalScrollIndicator={false} bounces={false}>

                {/* HERO */}
                <View style={styles.hero}>
                    <View style={styles.heroImgWrapper}>
                        {garment.image_url ? (
                            <Image source={{ uri: garment.image_url }} style={styles.heroImg} resizeMode="contain" />
                        ) : (
                            <View style={[styles.heroImg, { backgroundColor: garment.dominant_hex ?? '#EAE3DB' }]} />
                        )}
                    </View>

                    {/* TOPBAR */}
                    <SafeAreaView style={styles.topbar}>
                        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                            <Text style={styles.backBtnText}>← Back</Text>
                        </TouchableOpacity>
                        <View style={styles.actionRow}>
                            <TouchableOpacity style={styles.actBtn}><Text style={styles.actBtnIcon}>♡</Text></TouchableOpacity>
                            <TouchableOpacity style={styles.actBtn}><Text style={styles.actBtnIcon}>⋯</Text></TouchableOpacity>
                        </View>
                    </SafeAreaView>

                    {/* WADA BADGE */}
                    <View style={styles.wadaBadge}>
                        <Text style={styles.wbLabel}>WADA · TAG</Text>
                        <Text style={styles.wbName}>{garment.dominant_hex || 'Primary Color'}</Text>
                    </View>

                    {/* SCORE PILL */}
                    {garment.confidence !== null && (
                        <View style={styles.scorePill}>
                            <Text style={styles.spNum}>{(garment.confidence * 100).toFixed(0)}</Text>
                            <Text style={styles.spLbl}>CONFIDENCE</Text>
                        </View>
                    )}
                </View>

                {/* SHEET */}
                <View style={styles.sheet}>
                    <View style={styles.sheetHandle} />

                    <View style={styles.catPill}>
                        <View style={styles.catDot} />
                        <Text style={styles.catText}>{garment.category}</Text>
                    </View>

                    <Text style={styles.garmentName}>{garment.sub_category || garment.category}</Text>
                    <Text style={styles.garmentDesc}>Beautifully identified and isolated by the Chowa StyleBot vision engine.</Text>

                    <View style={styles.divider} />

                    {/* PALETTE */}
                    <View style={styles.section}>
                        <Text style={styles.secTitle}>EXTRACTED PALETTE</Text>
                        <View style={styles.paletteRow}>
                            <View style={styles.palItem}>
                                <View style={[styles.palSwatch, { backgroundColor: garment.dominant_hex ?? '#2C2C2C' }]} />
                                <Text style={styles.palName} numberOfLines={1}>Primary</Text>
                            </View>
                        </View>
                    </View>

                    {/* TAGS */}
                    {garment.all_labels && garment.all_labels.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.secTitle}>RECOGNIZED ELEMENTS</Text>
                            <View style={styles.tagsWrap}>
                                {garment.all_labels.map((tag, idx) => (
                                    // @ts-ignore
                                    <View key={tag || idx.toString()} style={styles.tag}>
                                        <Text style={styles.tagText}>{tag}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    <View style={styles.divider} />

                    {/* CTA */}
                    <View style={styles.ctaRow}>
                        <TouchableOpacity style={styles.ctaMain} onPress={() => navigation.navigate('Main')}>
                            <Text style={styles.ctaMainText}>Generate Outfits ✦</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.ctaSec}>
                            <Text style={styles.ctaSecIcon}>🗑</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, backgroundColor: '#FAFAF8', justifyContent: 'center', alignItems: 'center' },
    container: { flex: 1, backgroundColor: '#FAFAF8' },
    inner: { flex: 1 },

    hero: {
        width: '100%',
        height: height * 0.55, // approx 420px proportionally
        backgroundColor: '#EAE3DB', // fallback for gradient
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            web: { backgroundImage: 'linear-gradient(180deg, #EDE6DC 0%, #E4DCD0 100%)' }
        } as any)
    },
    heroImgWrapper: { width: '80%', height: '80%', alignItems: 'center', justifyContent: 'center' },
    heroImg: {
        width: '100%', height: '100%',
        shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.15, shadowRadius: 40, elevation: 10
    },

    topbar: {
        position: 'absolute', top: 0, left: 0, right: 0,
        paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 40 : 20,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
    },
    backBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: 'rgba(255,255,255,0.75)', borderRadius: 20, paddingVertical: 7, paddingHorizontal: 14,
        ...Platform.select({ web: { backdropFilter: 'blur(8px)' } } as any)
    },
    backBtnText: { fontFamily: 'System', fontSize: 12, color: '#1a1a1a', letterSpacing: 0.2 },

    actionRow: { flexDirection: 'row', gap: 8 },
    actBtn: {
        width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.75)',
        justifyContent: 'center', alignItems: 'center',
        ...Platform.select({ web: { backdropFilter: 'blur(8px)' } } as any)
    },
    actBtnIcon: { fontSize: 14, color: '#1a1a1a' },

    wadaBadge: {
        position: 'absolute', bottom: 32, left: 16,
        backgroundColor: 'rgba(26,26,26,0.7)', borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12,
        ...Platform.select({ web: { backdropFilter: 'blur(6px)' } } as any)
    },
    wbLabel: { fontFamily: 'System', fontSize: 8, letterSpacing: 1.2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', marginBottom: 2 },
    wbName: { fontFamily: 'System', fontSize: 12, fontWeight: '500', color: '#fff' },

    scorePill: {
        position: 'absolute', bottom: 32, right: 16,
        backgroundColor: 'rgba(140,109,79,0.9)', borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12, alignItems: 'center',
        ...Platform.select({ web: { backdropFilter: 'blur(6px)' } } as any)
    },
    spNum: { fontFamily: 'Georgia, serif', fontSize: 22, color: '#fff', lineHeight: 28 }, // Approximate Cormorant Garamond
    spLbl: { fontFamily: 'System', fontSize: 7, letterSpacing: 1, textTransform: 'uppercase', color: '#fff', opacity: 0.8 },

    sheet: {
        backgroundColor: '#FAFAF8',
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        marginTop: -24,
        paddingTop: 28, paddingHorizontal: 22, paddingBottom: 60,
    },
    sheetHandle: { width: 36, height: 3, backgroundColor: '#D8D2C8', borderRadius: 3, alignSelf: 'center', marginBottom: 24 },

    catPill: {
        flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
        backgroundColor: '#F0EBE3', borderRadius: 20, paddingVertical: 5, paddingHorizontal: 12, marginBottom: 12
    },
    catDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#8C6D4F' },
    catText: { fontFamily: 'System', fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: '#8C6D4F' },

    garmentName: { fontFamily: 'Georgia, serif', fontSize: 28, color: '#1a1a1a', marginBottom: 6, letterSpacing: -0.3 },
    garmentDesc: { fontFamily: 'System', fontSize: 13, color: '#888', lineHeight: 20, marginBottom: 22 },

    divider: { height: 1, backgroundColor: '#F0EBE3', marginVertical: 22 },

    section: { marginBottom: 22 },
    secTitle: { fontFamily: 'System', fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: '#BBB', marginBottom: 10 },

    paletteRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    palItem: { alignItems: 'center' },
    palSwatch: { width: 36, height: 36, borderRadius: 10, borderWidth: 2, borderColor: 'rgba(255,255,255,0.8)', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
    palName: { fontFamily: 'System', fontSize: 9, color: '#999', marginTop: 4, width: 36, textAlign: 'center' },

    tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    tag: { backgroundColor: '#F5F0E8', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12 },
    tagText: { fontFamily: 'System', fontSize: 11, color: '#5A4A3A', letterSpacing: 0.2 },

    ctaRow: { flexDirection: 'row', gap: 10 },
    ctaMain: { flex: 1, backgroundColor: '#1a1a1a', borderRadius: 16, padding: 15, alignItems: 'center', justifyContent: 'center' },
    ctaMainText: { fontFamily: 'System', fontSize: 13, fontWeight: '500', color: '#FAFAF8', letterSpacing: 0.3 },
    ctaSec: { width: 52, backgroundColor: '#F0EBE3', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    ctaSecIcon: { fontSize: 18 }
});
