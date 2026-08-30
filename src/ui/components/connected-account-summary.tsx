import { Pressable, StyleSheet, View } from 'react-native';

import { accountProviderLabel, type AccountUser } from '@/models/account';
import { PillyText } from '@/ui/components/pilly-text';
import { PillyIcon } from '@/ui/icons';
import { colors, radii, shadows, spacing } from '@/ui/tokens';

type Props = {
  user: AccountUser;
  active?: boolean;
  onPress?: () => void;
};

export function ConnectedAccountSummary({ user, active = false, onPress }: Props) {
  const title = active
    ? 'Pilly Plus preview is active'
    : `${accountProviderLabel(user.provider)} connected`;
  const content = (pressed = false) => (
    <>
      <View style={styles.icon}>
        <PillyIcon
          name={active ? 'success' : 'profile'}
          size={20}
          active={pressed}
          color={active ? colors.success : colors.brand}
        />
      </View>
      <View style={styles.copy}>
        <PillyText role="label">{title}</PillyText>
        <PillyText role="caption" muted numberOfLines={2}>
          {user.email}
        </PillyText>
      </View>
      <PillyIcon
        name={onPress ? 'next' : 'success'}
        size={18}
        active={pressed}
        color={onPress ? colors.textSecondary : colors.success}
      />
    </>
  );

  return onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${user.email}`}
      accessibilityHint="Manage your Pilly account"
      onPress={onPress}
      style={({ pressed }) => [styles.summary, pressed && styles.pressed]}
    >
      {({ pressed }) => content(pressed)}
    </Pressable>
  ) : (
    <View accessibilityLabel={`${title}, ${user.email}`} style={styles.summary}>
      {content()}
    </View>
  );
}

const styles = StyleSheet.create({
  summary: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.glass,
    ...shadows.soft,
  },
  icon: { width: 28, alignItems: 'center' },
  copy: { flex: 1, gap: spacing.xs },
  pressed: { opacity: 0.76, transform: [{ scale: 0.99 }] },
});
