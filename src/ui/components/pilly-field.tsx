import {
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
  type TextInputProps,
} from 'react-native';

import { PillyText } from './pilly-text';
import { PillyIcon, type PillyIconName } from '@/ui/icons';
import { colors, controlHeights, controlTypography, radii, shadows, spacing } from '@/ui/tokens';

type Props = TextInputProps & {
  label: string;
  hint?: string;
  error?: string;
  icon?: PillyIconName;
  optional?: boolean;
};

export function PillyField({
  label,
  hint,
  error,
  icon,
  optional,
  style,
  multiline,
  ...props
}: Props) {
  const { fontScale } = useWindowDimensions();
  const describedBy = error ? `${label}-error` : hint ? `${label}-hint` : undefined;
  return (
    <View style={styles.group}>
      <View style={styles.labelRow}>
        <PillyText role="caption" style={styles.label}>
          {label}
        </PillyText>
        {optional ? (
          <PillyText role="caption" muted style={styles.optionalLabel}>
            Optional
          </PillyText>
        ) : null}
      </View>
      <View style={[styles.inputShell, multiline && styles.multiline, error && styles.inputError]}>
        {icon ? (
          <View style={styles.iconSlot}>
            <PillyIcon name={icon} size={20} color={colors.textSecondary} />
          </View>
        ) : null}
        <TextInput
          accessibilityLabel={label}
          accessibilityHint={error ?? hint}
          aria-describedby={describedBy}
          allowFontScaling
          multiline={multiline}
          placeholderTextColor={colors.textSecondary}
          style={[
            styles.input,
            fontScale >= 1.3 && styles.inputLargeText,
            multiline && styles.multilineInput,
            style,
          ]}
          {...props}
        />
      </View>
      {error ? (
        <PillyText nativeID={`${label}-error`} role="caption" style={styles.error}>
          {error}
        </PillyText>
      ) : hint ? (
        <PillyText nativeID={`${label}-hint`} role="caption" muted>
          {hint}
        </PillyText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  inputShell: {
    minHeight: controlHeights.large,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 0,
    borderRadius: radii.md,
    backgroundColor: colors.glass,
    paddingHorizontal: spacing.lg,
    ...shadows.soft,
  },
  input: {
    flex: 1,
    height: 24,
    color: colors.textPrimary,
    lineHeight: 20,
    padding: 0,
    textAlignVertical: 'center',
    includeFontPadding: false,
    ...controlTypography,
  },
  inputLargeText: { height: undefined, minHeight: 32 },
  label: { flex: 1, fontWeight: '600' },
  optionalLabel: { flex: 1, textAlign: 'right' },
  iconSlot: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputError: { borderColor: colors.danger, borderWidth: 1.5 },
  error: { color: colors.danger },
  multiline: {
    minHeight: 96,
    alignItems: 'flex-start',
    paddingVertical: spacing.lg,
  },
  multilineInput: {
    height: 64,
    minHeight: 64,
    lineHeight: 21,
    textAlignVertical: 'top',
  },
});
