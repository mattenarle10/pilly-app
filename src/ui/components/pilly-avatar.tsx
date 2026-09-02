import { Image, StyleSheet, View } from 'react-native';

import { PillyIcon } from '@/ui/icons';
import { colors, radii } from '@/ui/tokens';

import { PillyText } from './pilly-text';

type Props = {
  displayName: string;
  uri?: string | null;
  plus?: boolean;
  size?: number;
  accessible?: boolean;
};

export function PillyAvatar({
  displayName,
  uri,
  plus = false,
  size = 44,
  accessible = true,
}: Props) {
  const initial = displayName.trim().charAt(0).toLocaleUpperCase() || 'P';
  const badgeSize = Math.max(15, Math.round(size * 0.34));
  return (
    <View style={{ width: size, height: size }}>
      {uri ? (
        <Image
          source={{ uri }}
          accessibilityLabel={`${displayName} profile photo`}
          accessible={accessible}
          accessibilityIgnoresInvertColors
          style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
        />
      ) : (
        <View
          accessibilityLabel={`${displayName} profile initial`}
          accessible={accessible}
          style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}
        >
          <PillyText role={size >= 60 ? 'title' : 'label'} style={styles.initial}>
            {initial}
          </PillyText>
        </View>
      )}
      {plus ? (
        <View
          style={[
            styles.badge,
            {
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
              right: -1,
              bottom: -1,
            },
          ]}
        >
          <PillyIcon name="done" size={Math.round(badgeSize * 0.68)} color={colors.surface} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { backgroundColor: colors.surfaceSubtle },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.lavenderSoft,
  },
  initial: { color: colors.brand, fontWeight: '700' },
  badge: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
    backgroundColor: colors.brand,
    borderRadius: radii.round,
  },
});
