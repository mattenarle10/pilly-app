import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import {
  PillyBanner,
  PillyIconButton,
  PillyIconTile,
  PillyText,
  Screen,
} from '@/design/components';
import { PillyIcon, type PillyIconName } from '@/design/icons';
import { colors, spacing } from '@/design/tokens';
import { useRepository } from '@/providers';

export function SettingsScreen() {
  const repository = useRepository();
  const medicines = useQuery({
    queryKey: ['medications', 'all'],
    queryFn: () => repository.listMedications({ includeArchived: true }),
    networkMode: 'always',
  });
  const archivedCount = medicines.data?.filter((medicine) => medicine.archivedAt).length ?? 0;
  return (
    <Screen>
      <View style={styles.header}>
        <PillyIconButton icon="back" label="Back" onPress={() => router.back()} />
        <PillyText role="title" accessibilityRole="header">
          Settings
        </PillyText>
      </View>

      <View style={styles.section}>
        <PillyText role="caption" muted>
          ON THIS IPHONE
        </PillyText>
        <SettingRow
          icon="phone"
          title="Saved on this device"
          message="No account. Works offline."
        />
        <SettingRow
          icon="reminder"
          title="Private reminders"
          message="Medicine names stay hidden."
          tone="peach"
        />
      </View>

      {medicines.isError ? (
        <PillyBanner kind="error" message="Couldn’t load local settings." compact />
      ) : null}
      <View style={styles.section}>
        <PillyText role="caption" muted>
          MANAGE
        </PillyText>
        <SettingRow
          icon="archive"
          title="Archived medicines"
          message={
            archivedCount === 0
              ? 'Nothing archived.'
              : `${archivedCount} ${archivedCount === 1 ? 'medicine' : 'medicines'}.`
          }
          onPress={() => router.push('/(tabs)/medicines')}
        />
        <SettingRow
          icon="palette"
          title="Pilly Plus"
          message="Themes, print, and export."
          tone="lavender"
          onPress={() => router.push('/plus')}
        />
      </View>
      <PillyText role="caption" muted style={styles.boundary}>
        Pilly records what you enter. It does not give medical advice.
      </PillyText>
    </Screen>
  );
}

function SettingRow({
  icon,
  title,
  message,
  tone,
  onPress,
}: {
  icon: PillyIconName;
  title: string;
  message: string;
  tone?: 'brand' | 'peach' | 'lavender';
  onPress?: () => void;
}) {
  const content = (
    <>
      <PillyIconTile icon={icon} tone={tone} />
      <View style={styles.copy}>
        <PillyText role="headline">{title}</PillyText>
        <PillyText role="caption" muted>
          {message}
        </PillyText>
      </View>
      {onPress ? <PillyIcon name="next" size={20} color={colors.textSecondary} /> : null}
    </>
  );
  return onPress ? (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.row}>
      {content}
    </Pressable>
  ) : (
    <View style={styles.row}>{content}</View>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  copy: { flex: 1, gap: spacing.xs },
  section: { gap: spacing.sm, marginTop: spacing.md },
  boundary: { textAlign: 'center', marginTop: spacing.lg },
});
