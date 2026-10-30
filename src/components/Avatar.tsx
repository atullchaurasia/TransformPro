import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { accentPalette } from '@/theme';

import { AppText } from './AppText';

export type AvatarProps = { name: string; uri?: string | null; size?: number };

export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const first = words[0]?.[0] ?? '';
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

/** Stable colour per name, so the same member always gets the same avatar colour. */
export function colorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return accentPalette[Math.abs(hash) % accentPalette.length] ?? accentPalette[0];
}

export function Avatar({ name, uri, size = 44 }: AvatarProps) {
  const shape = { width: size, height: size, borderRadius: size / 2 };
  if (uri) {
    return <Image source={{ uri }} style={shape} contentFit="cover" accessibilityLabel={name} transition={150} />;
  }
  return (
    <View style={[styles.center, shape, { backgroundColor: colorForName(name) }]} accessibilityLabel={name}>
      <AppText weight="700" style={{ color: '#FFFFFF', fontSize: size * 0.38 }}>
        {initialsOf(name)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({ center: { alignItems: 'center', justifyContent: 'center' } });
