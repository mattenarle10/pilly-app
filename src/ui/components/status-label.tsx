import { StyleSheet, View } from 'react-native';

import { PillyText } from './pilly-text';
import { PillyIcon, type PillyIconName } from '@/ui/icons';
import { colors, radii, spacing } from '@/ui/tokens';
import type { DoseStatus } from '@/models/dose';

export const doseStatusVisuals = {
  notRecorded: {
    label: 'Not yet',
    icon: 'pending',
    color: colors.textSecondary,
    background: colors.surfaceSubtle,
  },
  taken: {
    label: 'Taken',
    icon: 'taken',
    color: colors.brandStrong,
    background: colors.brandSoft,
  },
  skipped: {
    label: 'Skipped',
    icon: 'skipped',
    color: colors.warning,
    background: colors.warningSoft,
  },
} as const satisfies Record<
  DoseStatus,
  { label: string; icon: PillyIconName; color: string; background: string }
>;

type Props = { status: DoseStatus; label?: never } | { status?: never; label: string };

export function StatusLabel(props: Props) {
  const status =
    props.status ??
    (props.label === 'Taken' ? 'taken' : props.label === 'Skipped' ? 'skipped' : 'notRecorded');
  const state = doseStatusVisuals[status];
  return (
    <View
      accessibilityLabel={`Status: ${state.label}`}
      style={[styles.container, { backgroundColor: state.background }]}
    >
      <PillyIcon name={state.icon} size={16} color={state.color} />
      <PillyText role="caption" style={{ color: state.color }}>
        {state.label}
      </PillyText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 32,
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    borderRadius: radii.round,
  },
});
