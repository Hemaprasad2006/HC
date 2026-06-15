import React, { useEffect } from 'react';
import { useFonts } from 'expo-font';
import { Slot, useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import '../global.css';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Sora-Bold': require('../assets/fonts/Sora-Bold.ttf'),
    'Sora-SemiBold': require('../assets/fonts/Sora-SemiBold.ttf'),
    'Inter-Regular': require('../assets/fonts/Inter-Regular.ttf'),
    'Inter-Medium': require('../assets/fonts/Inter-Medium.ttf'),
  });

  const { isAuthenticated, isLoading, loadSession } = useAuthStore();
  const { loadTheme } = useThemeStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    loadSession();
    loadTheme();
  }, []);

  useEffect(() => {
    if (isLoading || !fontsLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isOnboarding = segments[0] === 'onboarding';

    if (!isAuthenticated && !inAuthGroup && !isOnboarding) {
      // Redirect to login
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect to tabs dashboard
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, fontsLoaded, segments]);

  if (isLoading || !fontsLoaded) {
    return (
      <View className="flex-1 justify-center items-center bg-[#0A0A0F]">
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  return <Slot />;
}
