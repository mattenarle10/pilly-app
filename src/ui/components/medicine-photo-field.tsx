import { Image, StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '@/ui/tokens';

import { PillyBanner } from './pilly-banner';
import { PillyButton } from './pilly-button';
import { PillyCard } from './pilly-card';
import { PillyText } from './pilly-text';

type Props = {
  uri: string | null;
  busy: boolean;
  error?: string | Error | null;
  onSelect: () => void;
  onRemove: () => void;
  onRetry?: () => void;
};

export function MedicinePhotoField({ uri, busy, error, onSelect, onRemove, onRetry }: Props) {
  const message = error instanceof Error ? error.message : error;
  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <PillyText role="title">Photo</PillyText>
        <PillyText role="caption" muted>
          Optional recognition photo. Private with Plus.
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
          <PillyText role="label">Recognition photo</PillyText>
          <PillyText role="caption" muted>
            Stored privately with your Plus account.
          </PillyText>
          <View style={styles.actions}>
            <PillyButton
              label={uri ? 'Replace' : 'Choose photo'}
              variant="secondary"
              size="compact"
              loading={busy}
              onPress={onSelect}
            />
            {uri ? (
              <PillyButton
                label="Remove"
                variant="quiet"
                size="compact"
                disabled={busy}
                onPress={onRemove}
              />
            ) : null}
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
  actions: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs },
});
