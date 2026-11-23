import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { OnboardingFlow } from '../components/OnboardingFlow';
import { AppProvider, useApp } from '../context/AppContext';
import { DialogProvider } from '../context/DialogContext';
import { theme } from '../theme/tokens';
import { configureNotifications } from '../utils/notifications';

function RootNavigator() {
  const { isReady, profile } = useApp();

  useEffect(() => {
    configureNotifications();
  }, []);

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
        <DialogProvider>
          <StatusBar style="light" />
          <RootNavigator />
        </DialogProvider>
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
