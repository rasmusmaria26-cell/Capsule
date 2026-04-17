import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// Screens
import AuthScreen from '../screens/AuthScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import DailyCheckInScreen from '../screens/DailyCheckInScreen';
import OutfitResultScreen from '../screens/OutfitResultScreen';
import CaptureScreen from '../screens/CaptureScreen';
import WardrobeScreen from '../screens/WardrobeScreen';
import ItemDetailScreen from '../screens/ItemDetailScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';

import { Colors } from '../theme/tokens';
import { useProfileStore } from '../store/profileStore';

// Type definitions
export type RootStackParamList = {
    Auth: undefined;
    Onboarding: undefined;
    Main: undefined;
    OutfitResult: { occasion: string; weather: string };
    CaptureScreen: undefined;
    ItemDetail: { garmentId: string };
    Settings: undefined;
};

export type MainTabParamList = {
    DailyCheckIn: undefined;
    Wardrobe: undefined;
    Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: Colors.surfaceElevated,
                    borderTopWidth: 0,              // No divider line rule
                    paddingBottom: 8,
                    paddingTop: 8,
                    height: 64,
                },
                tabBarActiveTintColor: Colors.accent,
                tabBarInactiveTintColor: Colors.textTertiary,
                tabBarLabelStyle: {
                    fontFamily: 'Manrope_600SemiBold',
                    fontSize: 11,
                },
            }}
        >
            <Tab.Screen
                name="DailyCheckIn"
                component={DailyCheckInScreen}
                options={{ title: 'Today' }}
            />
            <Tab.Screen
                name="Wardrobe"
                component={WardrobeScreen}
                options={{ title: 'Wardrobe' }}
            />
            <Tab.Screen
                name="Profile"
                component={ProfileScreen}
                options={{ title: 'Profile' }}
            />
        </Tab.Navigator>
    );
}

export default function Navigation() {
    const { isOnboarded, isAuthenticated } = useProfileStore();

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {!isAuthenticated ? (
                    <Stack.Screen name="Auth" component={AuthScreen} />
                ) : !isOnboarded ? (
                    <Stack.Screen name="Onboarding" component={OnboardingScreen} />
                ) : (
                    <>
                        <Stack.Screen name="Main" component={MainTabs} />
                        <Stack.Screen name="OutfitResult" component={OutfitResultScreen} />
                        <Stack.Screen name="CaptureScreen" component={CaptureScreen} />
                        <Stack.Screen name="ItemDetail" component={ItemDetailScreen} />
                        <Stack.Screen name="Settings" component={SettingsScreen} />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}
