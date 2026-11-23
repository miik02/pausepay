import { File, Paths } from 'expo-file-system';

export async function persistImageUri(sourceUri: string): Promise<string> {
  try {
    if (!sourceUri) return sourceUri;
    // Si ya está en almacenamiento persistente de la app, no duplicar
    if (sourceUri.includes('pp-img-')) return sourceUri;

    const cleanPath = sourceUri.split('?')[0];
    const extMatch = cleanPath.match(/\.([a-zA-Z0-9]{2,5})$/);
    const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';
    const filename = `pp-img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;

    const src = new File(sourceUri);
    const dest = new File(Paths.document, filename);
    if (dest.exists) {
      dest.delete();
    }
    src.copy(dest);
    return dest.uri;
  } catch {
    return sourceUri;
  }
}

export function deletePersistedImage(uri?: string): void {
  if (!uri || !uri.includes('pp-img-')) return;
  try {
    const file = new File(uri);
    if (file.exists) {
      file.delete();
    }
  } catch {
    // Ignorar si el archivo ya no existe
  }
}
