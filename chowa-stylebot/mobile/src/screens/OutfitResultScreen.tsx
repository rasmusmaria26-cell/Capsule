import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ScrollView, SafeAreaView, Image,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { useWardrobeStore, GeneratedOutfit } from '../store/wardrobeStore';
import { api } from '../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'OutfitResult'>;

export default function OutfitResultScreen({ route, navigation }: Props) {
    const { occasion, weather } = route.params;
    const outfits = useWardrobeStore((s) => s.lastGeneratedOutfits);

    // Store interactions: outfit_id -> 'worn' | 'skipped'
    const [interacted, setInteracted] = useState<Record<string, 'worn' | 'skipped'>>({});

    const handleAction = async (outfitId: string, action: 'worn' | 'skipped') => {
        setInteracted(prev => ({ ...prev, [outfitId]: action }));
        // Map 'skipped' back to the API's 'rejected' enum
        const apiAction = action === 'worn' ? 'worn' : 'rejected';
        try {
            await api.telemetry.log(outfitId, apiAction);
        } catch (e) {
            console.warn('Telemetry sync failed', e);
        }
    };

    if (!outfits || !outfits.length) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.topbar}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
                        <Text style={styles.backTxt}>← Today</Text>
                    </TouchableOpacity>
                </View>
                <Text style={{ textAlign: 'center', marginTop: 100, color: '#AAA' }}>No outfits generated for this context.</Text>
            </SafeAreaView>
        );
    }

    const getIconForSlot = (slot: string) => {
        if (slot === 'top') return '👕';
        if (slot === 'bottom') return '👖';
        if (slot === 'shoes') return '👟';
        if (slot === 'outerwear') return '🧥';
        return '🧵';
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.phoneScroll}>

                {/* Topbar */}
                <View style={styles.topbar}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
                        <Text style={styles.backTxt}>← Today</Text>
                    </TouchableOpacity>
                    <View style={styles.contextPill}>
                        <View style={styles.ctxDot} />
                        <Text style={styles.ctxTxt}>{occasion} · {weather}</Text>
                    </View>
                </View>

                {/* Header */}
                <View style={styles.secHead}>
                    <Text style={styles.secTitle}>Your <Text style={styles.secTitleItalic}>top 3</Text> fits</Text>
                    <Text style={styles.secSub}>Ranked by OKLCH color harmony</Text>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                    {outfits.slice(0, 3).map((outfit: GeneratedOutfit, idx: number) => {

                        const score = Math.round(outfit.final_score);
                        const isHigh = score > 70;
                        const state = interacted[outfit.outfit_id];

                        // Build valid items list to construct palette strip
                        const activeItems = ['outerwear', 'top', 'bottom', 'shoes']
                            .map(slot => ({ slot, item: outfit.items[slot as keyof typeof outfit.items] }))
                            .filter(e => e.item != null);

                        return (
                            <View key={outfit.outfit_id} style={styles.outfitCard}>

                                {/* Card Top */}
                                <View style={styles.cardTop}>
                                    <Text style={styles.rankLabel}>#0{idx + 1}</Text>
                                    <View style={[styles.scoreBadge, isHigh ? styles.scoreBadgeHigh : styles.scoreBadgeMid]}>
                                        <Text style={[styles.scoreNum, isHigh ? styles.scoreNumHigh : styles.scoreNumMid]}>{score}</Text>
                                        <Text style={[styles.scoreLbl, isHigh ? styles.scoreLblHigh : styles.scoreLblMid]}>SCORE</Text>
                                    </View>
                                </View>

                                {/* Palette Strip */}
                                <View style={styles.paletteStrip}>
                                    {activeItems.map((ai, i) => (
                                        <View key={i} style={[styles.ps, { backgroundColor: ai.item?.dominant_hex || '#EEE' }]} />
                                    ))}
                                </View>

                                {/* Garment List */}
                                <View style={styles.garmentList}>
                                    {activeItems.map((ai) => (
                                        <View key={ai.slot} style={styles.gitem}>
                                            <View style={styles.gimg}>
                                                {ai.item?.image_url ? (
                                                    <Image source={{ uri: ai.item.image_url }} style={styles.realImg} resizeMode="contain" />
                                                ) : (
                                                    <Text style={styles.gimgIcon}>{getIconForSlot(ai.slot)}</Text>
                                                )}
                                                <View style={[styles.gimgDot, { backgroundColor: ai.item?.dominant_hex || '#EEE' }]} />
                                            </View>
                                            <View style={styles.ginfo}>
                                                <Text style={styles.gcat}>{ai.slot}</Text>
                                                <Text style={styles.gname} numberOfLines={1}>{ai.item?.sub_category || 'Garment'}</Text>
                                                <Text style={styles.wadaMini}>Chowa · Hex {ai.item?.dominant_hex?.toUpperCase() || 'UNKNOWN'}</Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>

                                {/* Harmony Bar */}
                                <View style={styles.harmonyBar}>
                                    <View style={styles.hbRow}>
                                        <Text style={styles.hbLbl}>Harmony</Text>
                                        <Text style={styles.hbType}>OKLCH Generated Fit</Text>
                                    </View>
                                    <View style={styles.hbBg}>
                                        <View style={[styles.hbFill, { width: `${Math.min(score, 100)}%` }]} />
                                    </View>
                                </View>

                                {/* Actions or Worn State */}
                                {!state ? (
                                    <View style={styles.cardActions}>
                                        <TouchableOpacity style={styles.btnWear} onPress={() => handleAction(outfit.outfit_id, 'worn')} activeOpacity={0.8}>
                                            <Text style={styles.btnWearTxt}>Wear this ✦</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.btnSkip} onPress={() => handleAction(outfit.outfit_id, 'skipped')} activeOpacity={0.7}>
                                            <Text style={styles.btnSkipTxt}>Skip</Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <View style={styles.wornState}>
                                        <View style={[styles.wornCheck, state === 'skipped' && styles.wornSkipCheck]}>
                                            <Text style={[styles.wornCheckTxt, state === 'skipped' && styles.wornSkipCheckTxt]}>
                                                {state === 'worn' ? '✓' : '→'}
                                            </Text>
                                        </View>
                                        <Text style={styles.wornTxt}>
                                            {state === 'worn' ? 'Logged to your Chowa profile' : 'Skipped · helps tune your profile'}
                                        </Text>
                                    </View>
                                )}

                            </View>
                        );
                    })}
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#D0C8BC' },
    phoneScroll: { flex: 1, backgroundColor: '#F5F1EA', borderTopLeftRadius: 36, borderTopRightRadius: 36, marginTop: 12, paddingHorizontal: 18, paddingTop: 20 },

    topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16 },
    back: { flexDirection: 'row', alignItems: 'center' },
    backTxt: { fontSize: 13, color: '#8C6D4F', fontWeight: '500' },
    contextPill: { backgroundColor: '#1a1a1a', borderRadius: 20, paddingVertical: 5, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 6 },
    ctxDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#8C6D4F' },
    ctxTxt: { color: '#F5F1EA', fontSize: 11, letterSpacing: 0.4, textTransform: 'lowercase' },

    secHead: { marginBottom: 14 },
    secTitle: { fontFamily: 'Georgia', fontSize: 28, color: '#1a1a1a', letterSpacing: -0.3 },
    secTitleItalic: { fontStyle: 'italic', color: '#8C6D4F' },
    secSub: { fontSize: 11, color: '#AAA', marginTop: 2, letterSpacing: 0.2 },

    outfitCard: { backgroundColor: '#fff', borderRadius: 24, borderColor: '#EDE8DF', borderWidth: 1, marginBottom: 12, overflow: 'hidden' },

    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 16, paddingHorizontal: 18 },
    rankLabel: { fontFamily: 'Georgia', fontSize: 15, color: '#AAA', letterSpacing: 1 },
    scoreBadge: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    scoreBadgeHigh: { backgroundColor: '#1a1a1a' },
    scoreBadgeMid: { backgroundColor: '#EDE8DF' },
    scoreNum: { fontFamily: 'Georgia', fontSize: 20, lineHeight: 24 },
    scoreNumHigh: { color: '#fff' },
    scoreNumMid: { color: '#8C6D4F' },
    scoreLbl: { fontSize: 7, letterSpacing: 0.8, textTransform: 'uppercase' },
    scoreLblHigh: { color: 'rgba(255,255,255,0.5)' },
    scoreLblMid: { color: '#AAA' },

    paletteStrip: { flexDirection: 'row', height: 6, marginHorizontal: 18, marginTop: 12, borderRadius: 10, overflow: 'hidden' },
    ps: { flex: 1, height: '100%' },

    garmentList: { paddingHorizontal: 18, paddingTop: 12 },
    gitem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: '#F5F0E8' },
    gimg: { width: 44, height: 44, backgroundColor: '#F5F0E8', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    realImg: { width: '100%', height: '100%', borderRadius: 12 },
    gimgIcon: { fontSize: 22 },
    gimgDot: { position: 'absolute', bottom: -2, right: -2, width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: '#fff' },
    ginfo: { flex: 1, justifyContent: 'center' },
    gcat: { fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', color: '#8C6D4F', marginBottom: 1 },
    gname: { fontSize: 12, color: '#1a1a1a', fontWeight: '500' },
    wadaMini: { fontSize: 8, color: '#CCC', marginTop: 1 },

    harmonyBar: { marginHorizontal: 18, marginTop: 14 },
    hbRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
    hbLbl: { fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', color: '#BBB' },
    hbType: { fontSize: 10, color: '#8C6D4F', fontWeight: '500' },
    hbBg: { height: 3, backgroundColor: '#F0EBE3', borderRadius: 3, overflow: 'hidden' },
    hbFill: { height: '100%', backgroundColor: '#8C6D4F', borderRadius: 3 },

    cardActions: { flexDirection: 'row', gap: 8, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 16, marginTop: 4 },
    btnWear: { flex: 1, backgroundColor: '#1a1a1a', borderRadius: 14, paddingVertical: 13, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
    btnWearTxt: { color: '#FAFAF8', fontSize: 12, fontWeight: '500', letterSpacing: 0.4 },
    btnSkip: { backgroundColor: '#F5F0E8', borderRadius: 14, paddingVertical: 13, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' },
    btnSkipTxt: { color: '#8C6D4F', fontSize: 12, fontWeight: '500', letterSpacing: 0.3 },

    wornState: { alignItems: 'center', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 16, gap: 6 },
    wornCheck: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' },
    wornSkipCheck: { backgroundColor: '#F5F0E8' },
    wornCheckTxt: { color: '#fff', fontSize: 18 },
    wornSkipCheckTxt: { color: '#8C6D4F' },
    wornTxt: { fontSize: 11, color: '#8C6D4F', letterSpacing: 0.3 },
});
