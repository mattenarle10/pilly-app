import { StyleSheet, View } from 'react-native';

import { PillyIcon } from '@/ui/icons';
import { colors, controlHeights, radii, shadows, spacing } from '@/ui/tokens';
import { PillyIconButton } from './pilly-icon-button';
import { PillyText } from './pilly-text';

type Props = {
  tone: 'brand' | 'warning';
  message: string;
  actionLabel: string;
  onAction: () => void;
  actionDisabled?: boolean;
};

export function PillyToast({ tone, message, actionLabel, onAction, actionDisabled }: Props) {
  const foreground = tone === 'brand' ? colors.brandStrong : colors.warning;
  return (
    <View style={[styles.toast, tone === 'brand' ? styles.brand : styles.warning]}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.capsule, { borderColor: foreground }]}
      >
        <View style={[styles.capsuleHalf, { backgroundColor: foreground }]} />
        <View style={styles.capsuleHalf} />
        <View style={styles.capsuleIcon}>
          <PillyIcon name={tone === 'brand' ? 'done' : 'remove'} size={15} color={foreground} />
        </View>
      </View>
      <PillyText
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        role="label"
        style={[styles.message, { color: foreground }]}
      >
        {message}
      </PillyText>
      <PillyIconButton
        icon="undo"
        label={`${actionLabel} ${message.toLowerCase()}`}
        disabled={actionDisabled}
        onPress={onAction}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    minHeight: controlHeights.medium,
    maxWidth: 220,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.sm,
    paddingRight: spacing.xs,
    borderRadius: radii.round,
    ...shadows.floating,
  },
  brand: { backgroundColor: colors.brandSoft },
  warning: { backgroundColor: colors.warningSoft },
  capsule: {
    width: 34,
    height: 22,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderRadius: radii.round,
  },
  capsuleHalf: { flex: 1 },
  capsuleIcon: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: '50%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: { flexShrink: 1 },
});
