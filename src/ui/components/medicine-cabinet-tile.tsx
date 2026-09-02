import { useState } from 'react';
import { Image, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import type { MedicineCollectionItemModel } from '@/models/medicine-collection';
import { PillyIcon } from '@/ui/icons';
import { colors, radii, shadows, spacing } from '@/ui/tokens';
import { MedicineRecognition } from './medicine-recognition';
import { PillyText } from './pilly-text';

type Props = {
  item: MedicineCollectionItemModel;
  layout: 'cabinet' | 'list';
  onPress: () => void;
};

export function MedicineCabinetTile({ item, layout, onPress }: Props) {
  const [failedPhotoUri, setFailedPhotoUri] = useState<string | null>(null);
  const { fontScale } = useWindowDimensions();
  const showPhoto = item.photoUri !== null && item.photoUri !== failedPhotoUri;
  const nameLineLimit = fontScale >= 1.5 ? undefined : 2;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        layout === 'cabinet' ? styles.cabinet : styles.list,
        item.archived && styles.archived,
        pressed && styles.pressed,
      ]}
    >
      <View style={layout === 'cabinet' ? styles.cabinetRecognition : styles.listRecognition}>
        {showPhoto ? (
          <Image
            accessibilityIgnoresInvertColors
            testID={`medicine-photo-${item.id}`}
            resizeMode="cover"
            source={{ uri: item.photoUri ?? undefined }}
            onError={() => setFailedPhotoUri(item.photoUri)}
            style={layout === 'cabinet' ? styles.cabinetPhoto : styles.listPhoto}
          />
        ) : (
          <MedicineRecognition
            form={item.medication.form}
            tabletShape={item.medication.tabletShape}
            size={item.medication.appearanceSize}
            color={item.medication.appearanceColor}
            secondaryColor={item.medication.appearanceSecondaryColor}
            display={layout === 'cabinet' ? 'hero' : 'compact'}
          />
        )}
      </View>
      <View style={styles.copy}>
        <PillyText role="headline" numberOfLines={nameLineLimit} style={styles.name}>
          {item.name}
        </PillyText>
        {item.archived ? (
          <PillyText role="caption" muted>
            Archived
          </PillyText>
        ) : null}
      </View>
      {layout === 'list' ? <PillyIcon name="next" size={18} color={colors.textSecondary} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { backgroundColor: colors.surface },
  cabinet: {
    flex: 1,
    minHeight: 176,
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    ...shadows.soft,
  },
  list: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
  },
  archived: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  pressed: { backgroundColor: colors.peachSoft, transform: [{ scale: 0.985 }] },
  cabinetRecognition: {
    height: 106,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: radii.md,
  },
  listRecognition: {
    width: 68,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: radii.md,
  },
  cabinetPhoto: { width: '100%', height: '100%', borderRadius: radii.md },
  listPhoto: { width: 56, height: 56, borderRadius: radii.md },
  copy: { flex: 1, gap: spacing.xs },
  name: { textAlign: 'left' },
});
