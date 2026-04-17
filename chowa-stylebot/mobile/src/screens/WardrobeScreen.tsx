import React, { useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    Image, SafeAreaView, ActivityIndicator,
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
                setGarments(res.data.garments ?? []);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const renderItem = ({ item }: { item: Garment }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('ItemDetail', { garmentId: item.garment_id })}
            activeOpacity={0.85}
        >
            {item.image_url ? (
                <Image source={{ uri: item.image_url }} style={styles.thumb} resizeMode="cover" />
            ) : (
                <View style={[styles.thumb, { backgroundColor: item.dominant_hex ?? Colors.surface }]} />
            )}
            <View style={styles.info}>
                <Text style={styles.cat}>{item.category}</Text>
                <Text style={styles.sub}>{item.sub_category}</Text>
                {!item.is_confirmed && <Text style={styles.review}>Needs review</Text>}
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Wardrobe</Text>
                <TouchableOpacity onPress={() => navigation.navigate('CaptureScreen')}>
                    <Text style={styles.add}>+ Add</Text>
                </TouchableOpacity>
            </View>

            {isLoading ? (
                <ActivityIndicator style={{ marginTop: 60 }} color={Colors.accent} />
            ) : garments.length === 0 ? (
                <View style={styles.empty}>
                    <Text style={styles.emptyIcon}>👔</Text>
                    <Text style={styles.emptyTitle}>Your wardrobe is empty</Text>
                    <Text style={styles.emptyDesc}>Add your first garment to get started.</Text>
                    <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('CaptureScreen')}>
                        <Text style={styles.addBtnText}>Add garment</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={garments}
                    renderItem={renderItem}
                    keyExtractor={(g) => g.garment_id}
                    contentContainerStyle={styles.list}
                    numColumns={2}
                    columnWrapperStyle={styles.row}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing['2xl'], paddingBottom: Spacing.base },
    title: { fontFamily: 'Manrope_800ExtraBold', fontSize: Typography.sizes.xl, color: Colors.textPrimary },
    add: { fontFamily: 'Manrope_600SemiBold', fontSize: Typography.sizes.base, color: Colors.accent },
    list: { padding: Spacing.base, gap: Spacing.sm },
    row: { gap: Spacing.sm, marginBottom: Spacing.sm },
    card: { flex: 1, backgroundColor: Colors.surfaceElevated, ...Shadow.card },
    thumb: { width: '100%', aspectRatio: 0.8 },
    info: { padding: Spacing.sm, gap: 2 },
    cat: { fontFamily: 'Manrope_600SemiBold', fontSize: Typography.sizes.sm, color: Colors.textPrimary },
    sub: { fontFamily: 'Manrope_400Regular', fontSize: Typography.sizes.xs, color: Colors.textSecondary },
    review: { fontFamily: 'Manrope_500Medium', fontSize: Typography.sizes.xs, color: Colors.warning, marginTop: 2 },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing['2xl'] },
    emptyIcon: { fontSize: 48 },
    emptyTitle: { fontFamily: 'Manrope_700Bold', fontSize: Typography.sizes.lg, color: Colors.textPrimary },
    emptyDesc: { fontFamily: 'Manrope_400Regular', fontSize: Typography.sizes.base, color: Colors.textSecondary, textAlign: 'center' },
    addBtn: { backgroundColor: Colors.accent, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm, marginTop: Spacing.md },
    addBtnText: { fontFamily: 'Manrope_700Bold', fontSize: Typography.sizes.base, color: Colors.textInverse },
});
