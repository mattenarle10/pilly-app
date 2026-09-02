import { StyleSheet, View } from 'react-native';

import type { DoseTimePackModel } from '@/models/dose-time-pack';
import { spacing } from '@/ui/tokens';
import { DoseTimePack } from './dose-time-pack';

export function WeekAgenda({
  packs,
  onOpenPack,
}: {
  packs: DoseTimePackModel[];
  onOpenPack: (pack: DoseTimePackModel) => void;
}) {
  return (
    <View style={styles.list}>
      {packs.map((pack) => (
        <DoseTimePack key={pack.key} pack={pack} onPress={() => onOpenPack(pack)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
});
