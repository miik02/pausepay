import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { OnboardingFlow } from '../components/OnboardingFlow';
import { AppProvider, useApp } from '../context/AppContext';
import { theme } from '../theme/tokens';

function RootNavigator() {
  const { isReady, profile } = useApp();

  if (!isReady) {
    return <View style={styles.splash} />;
  }

  if (!profile.onboardingCompleted) {
    return <OnboardingFlow />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.bg },
      }}
    >
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="light" />
        <RootNavigator />
      </AppProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: theme.bg,
  },
});
