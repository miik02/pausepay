import { Linking, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { CurrencyCode, ImpulseItem, LanguageCode, SubscriptionItem } from '../types';
import { formatCurrency } from './finance';

const CHANNEL_ID = 'pausepay-quarantine';
const FORTY_EIGHT_HOURS_MS = 48 * 3600 * 1000;

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
        name: 'PausePay Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 200, 120, 200],
        lightColor: '#10B981',
      }).catch(() => {});
    }
  } catch {
    // Fallback silencioso
  }
}

async function ensureNotificationPermission(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === 'granted') return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === 'granted';
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

    const granted = await ensureNotificationPermission();
    if (!granted) return { permissionDenied: true };

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

export async function scheduleSubscriptionAlert(
  sub: SubscriptionItem,
  currency: CurrencyCode,
  lang: LanguageCode
): Promise<{ notificationId?: string; permissionDenied: boolean }> {
  try {
    const now = Date.now();
    if (sub.nextBillingAt <= now + 60000) {
      return { permissionDenied: false };
    }

    const granted = await ensureNotificationPermission();
    if (!granted) return { permissionDenied: true };

    // Aviso 48h antes; si faltan menos de 48h, avisa 2h antes del cobro (o en 5 min mínimo)
    let alertAt = sub.nextBillingAt - FORTY_EIGHT_HOURS_MS;
    if (alertAt <= now + 60000) {
      alertAt = Math.max(now + 5 * 60 * 1000, sub.nextBillingAt - 2 * 3600 * 1000);
    }

    const priceLabel = formatCurrency(sub.price, currency, 2);
    const isTrial = sub.cycle === 'trial';

    const title =
      lang === 'es'
        ? isTrial
          ? `¡Prueba gratis a punto de cobrar!: ${sub.name}`
          : `Renovación en 48h: ${sub.name}`
        : isTrial
          ? `Free trial ending soon: ${sub.name}`
          : `Renewal in 48h: ${sub.name}`;

    const body =
      lang === 'es'
        ? `Se cobrarán ${priceLabel}. Cancélala ahora si no la usas y suma el ahorro a tu Bóveda.`
        : `${priceLabel} will be charged soon. Cancel now if unused and rescue that money into your Vault.`;

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        data: { subscriptionId: sub.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(alertAt),
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
    // Ignorar si ya expiró
  }
}

export function openSystemSettings(): void {
  Linking.openSettings().catch(() => {});
}
