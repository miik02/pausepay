import { File, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { AppBackupPayload, ImpulseItem, SubscriptionItem, UserProfile } from '../types';
import { parseBackup, serializeBackup } from './storage';

export async function exportBackupFile(
  profile: UserProfile,
  items: ImpulseItem[],
  subscriptions: SubscriptionItem[] = []
): Promise<{ ok: boolean }> {
  try {
    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) return { ok: false };

    const dateTag = new Date().toISOString().slice(0, 10);
    const filename = `pausepay-backup-${dateTag}.json`;
    const file = new File(Paths.cache, filename);

    if (file.exists) {
      file.delete();
    }
    file.create();
    file.write(serializeBackup(profile, items, subscriptions));

    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      dialogTitle: 'PausePay Backup',
      UTI: 'public.json',
    });

    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export type ImportBackupResult =
  | { status: 'ok'; data: AppBackupPayload }
  | { status: 'cancelled' }
  | { status: 'invalid' };

export async function pickAndParseBackup(): Promise<ImportBackupResult> {
  try {
    const picked = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/plain', '*/*'],
      copyToCacheDirectory: true,
    });

    if (picked.canceled || !picked.assets || picked.assets.length === 0) {
      return { status: 'cancelled' };
    }

    const asset = picked.assets[0];
    const file = new File(asset.uri);
    const rawText = await file.text();
    const parsed = parseBackup(rawText);

    if (!parsed) {
      return { status: 'invalid' };
    }

    return { status: 'ok', data: parsed };
  } catch {
    return { status: 'invalid' };
  }
}
