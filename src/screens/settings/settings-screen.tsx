import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import {
  PillyBanner,
  PillyButton,
  PillyCard,
  PillyIconButton,
  PillyIconTile,
  PillyText,
  Screen,
} from '@/design/components';
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
        <PillyIconButton icon="chevron-back" label="Back" onPress={() => router.back()} />
        <PillyText role="title" accessibilityRole="header">
          Settings
        </PillyText>
      </View>

      <PillyCard style={styles.card}>
        <PillyIconTile icon="phone-portrait-outline" />
        <View style={styles.copy}>
          <PillyText role="headline">Saved on this device</PillyText>
          <PillyText role="caption" muted>
            No account is required. Core tracking works offline.
          </PillyText>
        </View>
      </PillyCard>

      <PillyCard style={styles.card}>
        <PillyIconTile icon="notifications-outline" tone="peach" />
        <View style={styles.copy}>
          <PillyText role="headline">Private reminders</PillyText>
          <PillyText role="caption" muted>
            Notifications never show medicine names.
          </PillyText>
        </View>
      </PillyCard>

      {medicines.isError ? (
        <PillyBanner kind="error" message="Couldn’t load local settings." compact />
      ) : null}
      <PillyCard style={styles.section}>
        <View style={styles.sectionTitle}>
          <Ionicons name="archive-outline" size={21} color={colors.brand} />
          <PillyText role="headline">Archived medicines</PillyText>
        </View>
        <PillyText role="caption" muted>
          {archivedCount === 0
            ? 'Nothing archived.'
            : `${archivedCount} ${archivedCount === 1 ? 'medicine' : 'medicines'} archived.`}
        </PillyText>
        <PillyButton
          label="View medicines"
          icon="medkit-outline"
          variant="secondary"
          size="medium"
          onPress={() => router.push('/(tabs)/medicines')}
          fullWidth
        />
      </PillyCard>

      <PillyButton
        label="Pilly Plus"
        icon="color-palette-outline"
        variant="secondary"
        onPress={() => router.push('/plus')}
        fullWidth
      />
      <PillyText role="caption" muted style={styles.boundary}>
        Pilly records what you enter. It does not give medical advice.
      </PillyText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  copy: { flex: 1, gap: spacing.xs },
  section: { gap: spacing.md },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  boundary: { textAlign: 'center', marginTop: spacing.lg },
});
