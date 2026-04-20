import React from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import {
  useFonts,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import { StatusBar } from 'expo-status-bar';
import Navigation from './src/navigation';
import { Colors } from './src/theme/tokens';

if (Platform.OS === 'web') {
  const style = document.createElement('style');
  style.textContent = `
        *:focus { outline: none !important; }
        a:focus { outline: none !important; }
    `;
  document.head.append(style);
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" backgroundColor={Colors.bg} />
      <Navigation />
    </>
  );
}
