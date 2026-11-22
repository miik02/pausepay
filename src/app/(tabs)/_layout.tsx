import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '../../constants/i18n';
import { useApp } from '../../context/AppContext';
import { theme } from '../../theme/tokens';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { profile, vaultStats } = useApp();
  const lang = profile.language;

  // Margen explícito para que la barra de 3 botones de Android nunca tape las pestañas
  const bottomInset = Math.max(insets.bottom, 10);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          height: 58 + bottomInset,
          paddingBottom: bottomInset,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t(lang, 'tabSimulate'),
          tabBarIcon: ({ size, focused }) => (
            <Ionicons
              name={focused ? 'calculator' : 'calculator-outline'}
              size={size}
              color={focused ? theme.accent : theme.textMuted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="vault"
        options={{
          title: t(lang, 'tabVault'),
          tabBarBadge: vaultStats.activeCount > 0 ? vaultStats.activeCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: theme.warning,
            color: '#1A1100',
            fontSize: 10,
            fontWeight: '800',
          },
          tabBarIcon: ({ size, focused }) => (
            <Ionicons
              name={focused ? 'shield-checkmark' : 'shield-checkmark-outline'}
              size={size}
              color={focused ? theme.accent : theme.textMuted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t(lang, 'tabSettings'),
          tabBarIcon: ({ size, focused }) => (
            <Ionicons
              name={focused ? 'settings' : 'settings-outline'}
              size={size}
              color={focused ? theme.accent : theme.textMuted}
            />
          ),
        }}
      />
    </Tabs>
  );
}
