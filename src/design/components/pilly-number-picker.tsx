import { Pressable, StyleSheet, View } from 'react-native';

import { PillyButton } from './pilly-button';
import { PillyCard } from './pilly-card';
import { PillyIconButton } from './pilly-icon-button';
import { PillyText } from './pilly-text';
import type { PillyIconName } from '@/design/icons';
import { colors, radii, spacing } from '@/design/tokens';

type Props = {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  presets?: readonly number[];
  action?: {
    icon: PillyIconName;
    label: string;
    onPress: () => void;
    disabled?: boolean;
  };
};

export function PillyNumberPicker({
  label,
  value,
  onChange,
  presets = [7, 14, 30, 90],
  action,
}: Props) {
  const decrement = () => {
    if (value !== null && value > 0) onChange(value - 1);
  };
  const increment = () => onChange(value === null ? 1 : value + 1);
  return (
    <View style={styles.group}>
      <View style={styles.labelRow}>
        <PillyText role="label">{label}</PillyText>
        <View style={styles.labelActions}>
          <PillyText role="caption" muted>
            Optional
          </PillyText>
          {action ? (
            <PillyIconButton
              icon={action.icon}
              label={action.label}
              tone={action.disabled ? 'plain' : 'brand'}
              disabled={action.disabled}
              onPress={action.onPress}
            />
          ) : null}
        </View>
      </View>
      <PillyCard
        padding="medium"
        style={styles.stepper}
        accessibilityLabel={label}
        accessibilityValue={{ text: value === null ? 'Not tracked' : `${value}` }}
      >
        <PillyIconButton
          icon="remove"
          label={`Decrease ${label}`}
          disabled={value === null || value <= 0}
          onPress={decrement}
        />
        <View style={styles.value}>
          <PillyText role="title">{value ?? '—'}</PillyText>
          <PillyText role="caption" muted>
            {value === null ? 'Not tracked' : value === 1 ? 'dose' : 'doses'}
          </PillyText>
        </View>
        <PillyIconButton icon="add" label={`Increase ${label}`} tone="brand" onPress={increment} />
      </PillyCard>
      <View style={styles.presets}>
        {presets.map((preset) => (
          <Pressable
            key={preset}
            accessibilityRole="button"
            accessibilityLabel={`Set ${label} to ${preset}`}
            onPress={() => onChange(preset)}
            style={[styles.preset, value === preset && styles.presetActive]}
          >
            <PillyText
              role="caption"
              style={value === preset ? styles.presetTextActive : undefined}
            >
              {preset}
            </PillyText>
          </Pressable>
        ))}
      </View>
      {value !== null ? (
        <PillyButton
          label="Clear supply"
          icon="close"
          variant="quiet"
          size="compact"
          onPress={() => onChange(null)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  labelActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepper: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  value: { flex: 1, alignItems: 'center' },
  presets: { flexDirection: 'row', gap: spacing.sm },
  preset: {
    flex: 1,
    minHeight: 44,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  presetTextActive: { color: colors.surface, fontWeight: '600' },
});
