import { Pressable, StyleSheet, View } from 'react-native';

import { PillyCard } from './pilly-card';
import { PillyButton } from './pilly-button';
import { PillyText } from './pilly-text';
import { PillyIcon, type PillyIconName } from '@/ui/icons';
import { colors, radii, spacing } from '@/ui/tokens';

type Props = {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  presets?: readonly number[];
  showOff?: boolean;
  supportingText?: string;
  embedded?: boolean;
};

export function PillyNumberPicker({
  label,
  value,
  onChange,
  presets = [7, 14, 30, 90],
  showOff = true,
  supportingText,
  embedded = false,
}: Props) {
  const decrement = () => {
    if (value !== null && value > 0) onChange(value - 1);
  };
  const increment = () => onChange(value === null ? 1 : value + 1);
  const content = (
    <>
      <View style={styles.mainRow}>
        <View style={styles.valueCopy}>
          <PillyText role="label">{label}</PillyText>
          {value === null ? (
            <PillyText role="caption" muted>
              Not tracked
            </PillyText>
          ) : (
            <View style={styles.valueRow}>
              <PillyText role="title">{value}</PillyText>
              <PillyText role="caption" muted>
                {value === 1 ? 'dose' : 'doses'}
              </PillyText>
            </View>
          )}
          {supportingText ? (
            <PillyText role="caption" muted>
              {supportingText}
            </PillyText>
          ) : null}
        </View>
        <View style={styles.controls}>
          {value === null ? (
            <PillyButton
              label="Start"
              accessibilityLabel={`Start tracking ${label}`}
              icon="add"
              size="compact"
              onPress={increment}
            />
          ) : (
            <View style={styles.stepper}>
              <StepperButton
                icon="remove"
                label={`Decrease ${label}`}
                disabled={value <= 0}
                onPress={decrement}
              />
              <StepperButton icon="add" label={`Increase ${label}`} onPress={increment} />
            </View>
          )}
        </View>
      </View>
      {presets.length > 0 || showOff ? (
        <>
          <View style={styles.divider} />
          <View style={styles.presets}>
            {presets.map((preset) => (
              <Pressable
                key={preset}
                accessibilityRole="button"
                accessibilityLabel={`Set ${label} to ${preset}`}
                accessibilityState={{ selected: value === preset }}
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
            {showOff ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Stop tracking ${label}`}
                accessibilityState={{ selected: value === null }}
                onPress={() => onChange(null)}
                style={[styles.preset, value === null && styles.presetActive]}
              >
                <PillyText
                  role="caption"
                  style={value === null ? styles.presetTextActive : styles.offText}
                >
                  Off
                </PillyText>
              </Pressable>
            ) : null}
          </View>
        </>
      ) : null}
    </>
  );

  return (
    <View style={styles.group}>
      {embedded ? (
        <View
          style={styles.card}
          accessibilityLabel={label}
          accessibilityValue={{ text: value === null ? 'Not tracked' : `${value}` }}
        >
          {content}
        </View>
      ) : (
        <PillyCard
          padding="medium"
          style={styles.card}
          accessibilityLabel={label}
          accessibilityValue={{ text: value === null ? 'Not tracked' : `${value}` }}
        >
          {content}
        </PillyCard>
      )}
    </View>
  );
}

function StepperButton({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: PillyIconName;
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.stepButton,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <PillyIcon name={icon} size={18} color={colors.brandStrong} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  card: { gap: spacing.md },
  mainRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  valueCopy: { flex: 1, gap: 2 },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  controls: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepper: {
    flexDirection: 'row',
    borderRadius: radii.round,
    backgroundColor: colors.surfaceSubtle,
    overflow: 'hidden',
  },
  stepButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.68, transform: [{ scale: 0.97 }] },
  disabled: { opacity: 0.35 },
  divider: { height: 1, backgroundColor: colors.surfaceSubtle },
  presets: { flexDirection: 'row', gap: spacing.xs },
  preset: {
    flex: 1,
    minHeight: 44,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetActive: { backgroundColor: colors.brand },
  presetTextActive: { color: colors.surface, fontWeight: '600' },
  offText: { color: colors.textSecondary },
});
