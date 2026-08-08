import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { PillyText } from './pilly-text';
import { colors, radii, spacing } from '@/design/tokens';
import type { DoseStatus } from '@/domain/dose';

const states = {
  notRecorded: {
    label: 'Not yet',
    icon: 'time-outline',
    color: colors.textSecondary,
    background: colors.surfaceSubtle,
  },
  taken: { label: 'Taken', icon: 'checkmark-circle', color: colors.success, background: '#e4f2e9' },
  skipped: {
    label: 'Skipped',
    icon: 'remove-circle-outline',
    color: colors.warning,
    background: colors.warningSoft,
  },
} as const;

type Props = { status: DoseStatus; label?: never } | { status?: never; label: string };

export function StatusLabel(props: Props) {
  const status =
    props.status ??
    (props.label === 'Taken' ? 'taken' : props.label === 'Skipped' ? 'skipped' : 'notRecorded');
  const state = states[status];
  return (
    <View
      accessibilityLabel={`Status: ${state.label}`}
      style={[styles.container, { backgroundColor: state.background }]}
    >
      <Ionicons name={state.icon} size={16} color={state.color} />
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
