import { Linking, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { CurrencyCode, ImpulseItem, LanguageCode } from '../types';
import { formatCurrency } from './finance';

const CHANNEL_ID = 'pausepay-quarantine';

export function configureNotifications(): void {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Quarantine Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 200, 120, 200],
        lightColor: '#10B981',
      }).catch(() => {});
    }
  } catch {
    // Fallback silencioso en entornos sin soporte nativo completo
  }
}

export async function scheduleQuarantineNotification(
  item: ImpulseItem,
  currency: CurrencyCode,
  lang: LanguageCode
): Promise<{ notificationId?: string; permissionDenied: boolean }> {
  try {
    if (item.unlockAt <= Date.now() + 5000) {
      return { permissionDenied: false };
    }

    const existing = await Notifications.getPermissionsAsync();
    let finalStatus = existing.status;

    if (finalStatus !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      finalStatus = requested.status;
    }

    if (finalStatus !== 'granted') {
      return { permissionDenied: true };
    }

    const priceLabel = formatCurrency(item.price, currency, 0);
    const futureLabel = formatCurrency(item.futureValue, currency, 0);

    const title =
      lang === 'es'
        ? `Cuarentena terminada: ${item.name}`
        : `Quarantine over: ${item.name}`;

    const body =
      lang === 'es'
        ? `¿Sigues queriendo gastar ${priceLabel} (${futureLabel} futuros)? Entra a tu Bóveda y decide.`
        : `Still want to spend ${priceLabel} (${futureLabel} future value)? Open your Vault and decide.`;

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        data: { impulseId: item.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(item.unlockAt),
        channelId: Platform.OS === 'android' ? CHANNEL_ID : undefined,
      },
    });

    return { notificationId, permissionDenied: false };
  } catch {
    return { permissionDenied: false };
  }
}

export async function cancelQuarantineNotification(notificationId?: string): Promise<void> {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // Ignorar si ya expiró o fue cancelada
  }
}

export function openSystemSettings(): void {
  Linking.openSettings().catch(() => {});
}
