import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    SafeAreaView, Alert, ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { Colors, Typography, Spacing } from '../theme/tokens';
import { useWardrobeStore } from '../store/wardrobeStore';
import { api } from '../services/api';

export default function CaptureScreen() {
    const navigation = useNavigation();
    const [uploading, setUploading] = useState(false);
    const addGarment = useWardrobeStore((s) => s.addGarment);

    const pickImage = async (fromCamera: boolean) => {
        const result = fromCamera
            ? await ImagePicker.launchCameraAsync({ quality: 0.85, allowsEditing: true })
            : await ImagePicker.launchImageLibraryAsync({ quality: 0.85, allowsEditing: true });

        if (result.canceled) return;
        await uploadImage(result.assets[0].uri);
    };

    const uploadImage = async (uri: string) => {
        setUploading(true);
        try {
            const formData = new FormData();

            // Web compatibility fix: URI needs to be converted to a blob
            if (uri.startsWith('data:') || uri.startsWith('blob:') || uri.startsWith('http')) {
                const response = await fetch(uri);
                const blob = await response.blob();
                formData.append('file', blob, 'garment.jpg');
            } else {
                formData.append('file', {
                    uri,
                    name: 'garment.jpg',
                    type: 'image/jpeg',
                } as any);
            }

            const res = await api.wardrobe.upload(formData);

            // Loop through all individually extracted items
            res.data.items.forEach((item: any) => addGarment(item));

            if (res.data.needs_review) {
                Alert.alert(
                    'Review needed',
                    "We're not 100% sure about some of the items in this photo. Tap to confirm the details.",
                    [{ text: 'Review', onPress: () => navigation.goBack() }]
                );
            } else {
                Alert.alert('Added!', `${res.data.items.length} garment(s) added to your wardrobe.`, [
                    { text: 'Done', onPress: () => navigation.goBack() },
                    { text: 'Add another' },
                ]);
            }
        } catch {
            Alert.alert('Upload failed', 'Could not process the image. Try again.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {uploading ? (
                <View style={styles.loading}>
                    <ActivityIndicator size="large" color={Colors.accent} />
                    <Text style={styles.loadingText}>Analysing garment…</Text>
                </View>
            ) : (
                <View style={styles.inner}>
                    <Text style={styles.heading}>Add a garment</Text>
                    <Text style={styles.sub}>
                        Take or upload a clear photo on a plain background for best results.
                    </Text>

                    <View style={styles.actions}>
                        <TouchableOpacity style={styles.btn} onPress={() => pickImage(true)} activeOpacity={0.85}>
                            <Text style={styles.btnIcon}>📷</Text>
                            <Text style={styles.btnText}>Camera</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={() => pickImage(false)} activeOpacity={0.85}>
                            <Text style={styles.btnIcon}>🖼</Text>
                            <Text style={[styles.btnText, styles.btnTextSecondary]}>Library</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Text style={styles.cancel}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md },
    loadingText: { fontFamily: 'Manrope_500Medium', fontSize: Typography.sizes.base, color: Colors.textSecondary },
    inner: { flex: 1, padding: Spacing['2xl'], justifyContent: 'center', gap: Spacing.xl },
    heading: { fontFamily: 'Manrope_800ExtraBold', fontSize: Typography.sizes['2xl'], color: Colors.textPrimary, letterSpacing: -0.5 },
    sub: { fontFamily: 'Manrope_400Regular', fontSize: Typography.sizes.base, color: Colors.textSecondary, lineHeight: 22 },
    actions: { gap: Spacing.md },
    btn: { backgroundColor: Colors.accent, padding: Spacing.base, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm },
    btnSecondary: { backgroundColor: Colors.surface },
    btnIcon: { fontSize: 20 },
    btnText: { fontFamily: 'Manrope_700Bold', fontSize: Typography.sizes.base, color: Colors.textInverse },
    btnTextSecondary: { color: Colors.textPrimary },
    cancel: { fontFamily: 'Manrope_500Medium', fontSize: Typography.sizes.base, color: Colors.textTertiary, textAlign: 'center' },
});
