import React, { useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    Image, SafeAreaView, ActivityIndicator, ScrollView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { Colors, Typography, Spacing, Shadow } from '../theme/tokens';
import { useWardrobeStore, Garment } from '../store/wardrobeStore';
import { api } from '../services/api';

export default function WardrobeScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { garments, setGarments, isLoading, setLoading } = useWardrobeStore();

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const res = await api.wardrobe.getAll();
                setGarments(res.data.items ?? []);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const renderItem = ({ item }: { item: Garment }) => (
        <View style={styles.cardContainer}>
            {/* Delicate Hanger Graphic */}
            <View style={styles.hangerContainer}>
                <View style={styles.hangerWire} />
                <View style={styles.hangerBase} />
            </View>

            <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('ItemDetail', { garmentId: item.garment_id })}
                activeOpacity={0.85}
            >
                {/* Clean White Gallery Background */}
                <View style={styles.imageMat}>
                    {item.image_url ? (
                        <Image source={{ uri: item.image_url }} style={styles.thumb} resizeMode="contain" />
                    ) : (
                        <View style={[styles.thumb, { backgroundColor: item.dominant_hex ?? Colors.surface }]} />
                    )}
                    <View style={styles.favoriteBtn}>
                        <Text style={styles.favoriteIcon}>♡</Text>
                    </View>
                </View>

                {/* Content Separation */}
                <View style={styles.info}>
                    <Text style={styles.titleText} numberOfLines={1}>{item.sub_category || item.category}</Text>
                    <Text style={styles.categoryText}>{item.category}</Text>
                    {!item.is_confirmed && <Text style={styles.review}>Needs review</Text>}
                </View>
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Premium Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Wardrobe</Text>
            </View>

            {/* Categories */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
                {['All Items', 'Tops', 'Bottoms', 'Outerwear', 'Shoes'].map((cat, i) => (
                    <TouchableOpacity key={i} activeOpacity={0.7} style={[styles.categoryTab, { outlineStyle: 'none' } as any]}>
                        <Text style={[styles.categoryTabText, i === 0 && styles.categoryTabActive]}>{cat}</Text>
                        {i === 0 && <View style={styles.activeIndicator} />}
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {isLoading ? (
                <ActivityIndicator style={{ marginTop: 60 }} color={Colors.accent} />
            ) : garments.length === 0 ? (
                <View style={styles.empty}>
                    <Text style={styles.emptyIcon}>👔</Text>
                    <Text style={styles.emptyTitle}>Your wardrobe is empty</Text>
                    <Text style={styles.emptyDesc}>Add your first garment to get started.</Text>
                </View>
            ) : (
                <FlatList
                    data={garments.filter(Boolean)}
                    renderItem={renderItem}
                    keyExtractor={(g) => g.garment_id}
                    contentContainerStyle={styles.list}
                    numColumns={2}
                    columnWrapperStyle={styles.row}
                    showsVerticalScrollIndicator={false}
                />
            )}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate('CaptureScreen')}
                activeOpacity={0.8}
            >
                <Text style={styles.fabIcon}>+</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9f9f7' },
    header: { padding: Spacing['2xl'], paddingBottom: Spacing.md, paddingTop: Spacing['3xl'] },
    title: { fontFamily: 'Georgia, serif', fontSize: 32, fontStyle: 'italic', letterSpacing: -0.5, color: '#1a1c1b', fontWeight: 'bold' },

    categories: { flexDirection: 'row', paddingHorizontal: Spacing['2xl'], paddingBottom: Spacing.xl, gap: Spacing.md },
    categoryTab: { alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8 },
    categoryTabText: { fontFamily: 'System', fontSize: 14, color: '#81756b' },
    categoryTabActive: { color: '#1a1c1b', fontWeight: '600' },
    activeIndicator: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#1a1c1b', marginTop: 4 },

    list: { paddingHorizontal: Spacing['2xl'], paddingTop: 16, paddingBottom: 100 },
    row: { gap: Spacing.xl, marginBottom: Spacing['3xl'] },

    cardContainer: { flex: 1, alignItems: 'center', marginTop: 32 },
    hangerContainer: { position: 'absolute', top: -30, alignItems: 'center', zIndex: 10, width: '100%' },
    hangerWire: { width: 1, height: 30, backgroundColor: '#81756b', opacity: 0.5 },
    hangerBase: { width: 64, height: 4, borderRadius: 2, backgroundColor: '#4a4744', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },

    card: { flex: 1, width: '100%', alignItems: 'center' },
    imageMat: {
        width: '100%',
        aspectRatio: 0.75,
        backgroundColor: '#ffffff',
        borderRadius: 8,
        position: 'relative'
    },
    thumb: { width: '100%', height: '100%' },

    favoriteBtn: { position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(249,249,247,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
    favoriteIcon: { color: '#1a1c1b', fontSize: 16 },

    info: { paddingTop: 16, alignItems: 'center', width: '100%' },
    titleText: { fontFamily: 'System', fontWeight: '600', fontSize: 13, color: '#1a1c1b', textAlign: 'center' },
    categoryText: { fontFamily: 'System', fontSize: 12, color: '#76736c', marginTop: 4, textAlign: 'center' },
    review: { fontFamily: 'System', fontWeight: '500', fontSize: 12, color: '#ba1a1a', marginTop: 4 },

    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing['2xl'] },
    emptyIcon: { fontSize: 48 },
    emptyTitle: { fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 'bold', fontSize: 24, color: '#1a1c1b' },
    emptyDesc: { fontFamily: 'System', fontSize: 14, color: '#76736c', textAlign: 'center' },

    fab: {
        position: 'absolute', bottom: Spacing['3xl'], right: Spacing['2xl'],
        width: 64, height: 64, borderRadius: 32,
        backgroundColor: '#8c6d4f',
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#1a1c1b', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.06, shadowRadius: 32, elevation: 6
    },
    fabIcon: { color: '#fff9f6', fontSize: 32, fontWeight: '300' }
});
