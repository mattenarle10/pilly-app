import { StyleSheet, View } from 'react-native';

import { accountProviderLabel, type AccountUser } from '@/models/account';
import { PillyText } from '@/ui/components/pilly-text';
import { PillyIcon } from '@/ui/icons';
import { colors, radii, shadows, spacing } from '@/ui/tokens';

type Props = {
  user: AccountUser;
};

export function ConnectedAccountSummary({ user }: Props) {
  const title = `${accountProviderLabel(user.provider)} connected`;
  return (
    <View accessible accessibilityLabel={`${title}, ${user.email}`} style={styles.summary}>
      <View style={styles.icon}>
        <PillyIcon name="profile" size={20} color={colors.brand} />
      </View>
      <View style={styles.copy}>
        <PillyText role="label">{title}</PillyText>
        <PillyText role="caption" muted>
          {user.email}
        </PillyText>
      </View>
      <PillyIcon name="success" size={18} color={colors.success} />
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
  copy: { flex: 1, minWidth: 0, gap: spacing.xs },
});
