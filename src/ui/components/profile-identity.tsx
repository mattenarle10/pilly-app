import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/ui/tokens';
import { PillyIcon } from '@/ui/icons';

import { PillyAvatar } from './pilly-avatar';
import { PillyText } from './pilly-text';

type Props = {
  displayName: string;
  profileName: string;
  avatarUri: string | null;
  plusActive: boolean;
  profileLoading: boolean;
  avatarBusy: boolean;
  canUploadAvatar: boolean;
  canRemoveAvatar: boolean;
  onEditName: () => void;
  onManageAvatar: () => void;
};

export function ProfileIdentity({
  displayName,
  profileName,
  avatarUri,
  plusActive,
  profileLoading,
  avatarBusy,
  canUploadAvatar,
  canRemoveAvatar,
  onEditName,
  onManageAvatar,
}: Props) {
  const canManageAvatar = canUploadAvatar || canRemoveAvatar;
  const avatarActionLabel = canUploadAvatar
    ? avatarUri
      ? 'Change profile photo'
      : 'Add profile photo'
    : 'Remove profile photo';
  const visibleName = profileName || 'Your Pilly';

  return (
    <View style={styles.identity}>
      {canManageAvatar ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={avatarActionLabel}
          accessibilityHint={
            canUploadAvatar
              ? 'Opens profile photo options'
              : 'Opens the option to remove this profile photo'
          }
          accessibilityState={{ disabled: avatarBusy, busy: avatarBusy }}
          disabled={avatarBusy}
          onPress={onManageAvatar}
          style={({ pressed }) => [
            styles.avatarControl,
            pressed && styles.pressed,
            avatarBusy && styles.disabled,
          ]}
        >
          <PillyAvatar displayName={displayName} uri={avatarUri} size={64} accessible={false} />
          <View style={styles.avatarIcon} pointerEvents="none">
            {avatarBusy ? (
              <ActivityIndicator color={colors.brand} size="small" />
            ) : (
              <PillyIcon
                name={canUploadAvatar ? 'photo' : 'delete'}
                size={15}
                color={colors.brand}
              />
            )}
          </View>
        </Pressable>
      ) : (
        <PillyAvatar displayName={displayName} uri={avatarUri} plus={plusActive} size={64} />
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Edit name"
        accessibilityHint={`Current name: ${visibleName}`}
        disabled={profileLoading}
        onPress={onEditName}
        style={({ pressed }) => [
          styles.nameAction,
          pressed && styles.pressed,
          profileLoading && styles.disabled,
        ]}
      >
        {profileLoading ? (
          <View accessibilityLabel="Loading profile" style={styles.loadingName}>
            <ActivityIndicator color={colors.brand} />
            <PillyText role="caption" muted>
              Loading profile…
            </PillyText>
          </View>
        ) : (
          <View style={styles.nameRow}>
            <PillyText role="title" style={styles.name}>
              {visibleName}
            </PillyText>
            <PillyIcon name="edit" size={18} color={colors.brand} />
          </View>
        )}
        <PillyText role="caption" muted>
          {plusActive ? 'Pilly Plus active' : 'Local profile'}
        </PillyText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  identity: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
  },
  avatarControl: { width: 64, height: 64 },
  avatarIcon: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  nameAction: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    alignSelf: 'stretch',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: { flexShrink: 1, fontWeight: '600' },
  loadingName: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pressed: { opacity: 0.68 },
  disabled: { opacity: 0.4 },
});
