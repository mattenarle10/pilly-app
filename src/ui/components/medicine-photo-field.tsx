import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';

import { colors, controlHeights, radii, spacing } from '@/ui/tokens';
import type { MedicinePhotoSource } from '@/services/medicine-image-cache';

import { PillyBanner } from './pilly-banner';
import { PillyButton } from './pilly-button';
import { PillyCard } from './pilly-card';
import { PillyText } from './pilly-text';
import { showPhotoSourceMenu } from './photo-source-menu';

type Props = {
  uri: string | null;
  busy: boolean;
  error?: string | Error | null;
  onSelect: (source: MedicinePhotoSource) => void;
  onRemove: () => void;
  onRetry?: () => void;
};

export function MedicinePhotoField({ uri, busy, error, onSelect, onRemove, onRetry }: Props) {
  const message = error instanceof Error ? error.message : error;
  const chooseSource = () => showPhotoSourceMenu('Medicine photo', onSelect);
  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <PillyText role="title">Medicine photo</PillyText>
        <PillyText role="caption" muted>
          Optional photo to help recognize this medicine.
        </PillyText>
      </View>
      <PillyCard padding="medium" style={styles.surface}>
        {uri ? (
          <Image
            source={{ uri }}
            accessibilityLabel="Medicine recognition photo"
            resizeMode="cover"
            style={styles.preview}
          />
        ) : (
          <View accessible accessibilityLabel="No medicine photo" style={styles.placeholder}>
            <PillyText role="caption" muted>
              No photo
            </PillyText>
          </View>
        )}
        <View style={styles.copy}>
          <PillyText role="label">{uri ? 'Photo added' : 'No photo yet'}</PillyText>
          <View style={styles.actions}>
            {busy ? (
              <View
                accessible
                accessibilityLabel="Updating medicine photo"
                accessibilityRole="progressbar"
                accessibilityState={{ busy: true }}
                style={styles.progress}
              >
                <ActivityIndicator color={colors.brand} />
              </View>
            ) : (
              <>
                <PillyButton
                  label={uri ? 'Change photo' : 'Add photo'}
                  variant="secondary"
                  size="compact"
                  onPress={chooseSource}
                />
                {uri ? (
                  <PillyButton label="Remove" variant="quiet" size="compact" onPress={onRemove} />
                ) : null}
              </>
            )}
          </View>
        </View>
      </PillyCard>
      {message ? (
        <PillyBanner
          kind="error"
          message={message}
          actionLabel={onRetry ? 'Retry' : undefined}
          onAction={onRetry}
          compact
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  heading: { gap: spacing.xs },
  surface: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  preview: { width: 88, height: 88, borderRadius: radii.md, backgroundColor: colors.surfaceSubtle },
  placeholder: {
    width: 88,
    height: 88,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSubtle,
  },
  copy: { flex: 1, gap: spacing.xs },
  actions: {
    minHeight: controlHeights.compact,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  progress: {
    minWidth: controlHeights.compact,
    minHeight: controlHeights.compact,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
