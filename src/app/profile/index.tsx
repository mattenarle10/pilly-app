import { useState, type ReactNode } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';

import { PillyBanner } from '@/ui/components/pilly-banner';
import { ProfileIdentity } from '@/ui/components/profile-identity';
import { ProfileNameDialog } from '@/ui/components/profile-name-dialog';
import { PillyText } from '@/ui/components/pilly-text';
import { Screen } from '@/ui/components/screen';
import { PillyIcon, type PillyIconName } from '@/ui/icons';
import { colors, radii, shadows, spacing } from '@/ui/tokens';
import { useAccountSession } from '@/hooks/use-account-session';
import { useProfile } from '@/hooks/use-profile';
import { useProfileAvatar } from '@/hooks/use-profile-avatar';
import { accountProviderLabel } from '@/models/account';
import { isPlusPurchasesSupported } from '@/services/purchases';
import { showPhotoSourceMenu } from '@/ui/components/photo-source-menu';

export default function ProfileRoute() {
  const account = useAccountSession();
  const profile = useProfile();
  const avatar = useProfileAvatar();
  const plusSupported = isPlusPurchasesSupported();
  const [nameModalOpen, setNameModalOpen] = useState(false);
  const [websiteError, setWebsiteError] = useState(false);
  const websiteUrl = process.env.EXPO_PUBLIC_WEBSITE_URL?.startsWith('https://')
    ? process.env.EXPO_PUBLIC_WEBSITE_URL
    : null;
  const archivedMessage = `${profile.archivedCount} ${profile.archivedCount === 1 ? 'medicine' : 'medicines'}`;

  const openNameEditor = () => {
    profile.saveName.reset();
    setNameModalOpen(true);
  };
  const openWebsite = async () => {
    if (!websiteUrl) return;
    setWebsiteError(false);
    try {
      await Linking.openURL(websiteUrl);
    } catch {
      setWebsiteError(true);
    }
  };
  const showAvatarMenu = () =>
    showPhotoSourceMenu({
      title: 'Profile photo',
      onSelect: avatar.canUpload ? (source) => void avatar.select(source) : undefined,
      onRemove: avatar.canRemove ? () => void avatar.remove() : undefined,
    });
  const displayName = profile.displayName || account.state.user?.displayName || 'Pilly';
  return (
    <>
      <Screen
        safeAreaEdges={['bottom']}
        contentInsetAdjustmentBehavior="never"
        contentStyle={styles.screen}
      >
        <ProfileIdentity
          displayName={displayName}
          profileName={profile.displayName}
          avatarUri={avatar.uri}
          plusActive={avatar.plusActive}
          profileLoading={profile.isLoading}
          avatarBusy={avatar.isBusy}
          canUploadAvatar={avatar.canUpload}
          canRemoveAvatar={avatar.canRemove}
          onEditName={openNameEditor}
          onManageAvatar={showAvatarMenu}
        />

        {avatar.error ? (
          <PillyBanner
            kind="error"
            message={avatar.error}
            actionLabel={avatar.errorKind === 'selection' ? 'Choose again' : 'Try again'}
            onAction={avatar.errorKind === 'selection' ? showAvatarMenu : () => void avatar.retry()}
            compact
          />
        ) : null}

        {profile.isError ? (
          <PillyBanner
            kind="error"
            title="Couldn’t load all profile details"
            message="Your saved data is still on this iPhone."
            actionLabel="Try again"
            onAction={() => void profile.retry()}
            compact
          />
        ) : null}

        {profile.archivedCount > 0 ? (
          <ProfileSection title="Manage">
            <ProfileRow
              icon="archive"
              title="Archived medicines"
              message={archivedMessage}
              onPress={() => router.push('/(tabs)/medicines')}
            />
          </ProfileSection>
        ) : null}

        <ProfileSection title="Your data">
          {account.state.kind === 'signed-in' ? (
            <>
              <ProfileRow
                icon="profile"
                title="Account"
                message={`${accountProviderLabel(account.state.user.provider)} · ${account.state.user.email}`}
                onPress={() => router.push('/account')}
              />
              <View style={styles.separator} />
            </>
          ) : null}
          <ProfileRow
            icon="document"
            title="Export data"
            message="Download or share a private copy"
            onPress={() => router.push('/profile/export')}
          />
        </ProfileSection>

        <ProfileSection title="Pilly">
          {plusSupported ? (
            <>
              <ProfileRow
                icon="favorite"
                title="Pilly Plus"
                message="Private backup, recovery, and medicine photos"
                onPress={() => router.push('/plus')}
              />
              <View style={styles.separator} />
            </>
          ) : null}
          <ProfileRow
            icon="website"
            title="About Pilly"
            message={`Version ${Constants.expoConfig?.version ?? '1.0.0'}`}
            onPress={websiteUrl ? () => void openWebsite() : undefined}
          />
        </ProfileSection>

        {websiteError ? (
          <PillyBanner kind="error" message="Couldn’t open the website." compact />
        ) : null}

        <PillyText role="caption" muted style={styles.boundary}>
          Medicine data stays on this iPhone. Pilly records what you enter and does not give medical
          advice.
        </PillyText>
      </Screen>

      {nameModalOpen ? (
        <ProfileNameDialog
          name={profile.name}
          saving={profile.saveName.isPending}
          saveError={profile.saveName.isError}
          onResetError={profile.saveName.reset}
          onSave={(name) =>
            profile.saveName.mutate(name, { onSuccess: () => setNameModalOpen(false) })
          }
          onClose={() => setNameModalOpen(false)}
        />
      ) : null}
    </>
  );
}

function ProfileSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <PillyText role="headline">{title}</PillyText>
      <View style={styles.surface}>{children}</View>
    </View>
  );
}

function ProfileRow({
  icon,
  title,
  message,
  onPress,
}: {
  icon: PillyIconName;
  title: string;
  message: string;
  onPress?: () => void;
}) {
  const content = (pressed = false) => (
    <>
      <View style={styles.rowIcon}>
        <PillyIcon name={icon} size={20} color={colors.brand} active={pressed} />
      </View>
      <View style={styles.rowCopy}>
        <PillyText role="label">{title}</PillyText>
        <PillyText role="caption" muted>
          {message}
        </PillyText>
      </View>
      {onPress ? (
        <PillyIcon name="next" size={18} color={colors.textSecondary} active={pressed} />
      ) : null}
    </>
  );

  return onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={message}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      {({ pressed }) => content(pressed)}
    </Pressable>
  ) : (
    <View style={styles.row}>{content()}</View>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xxxl },
  section: { gap: spacing.sm },
  surface: {
    overflow: 'hidden',
    borderRadius: radii.lg,
    backgroundColor: colors.glass,
    ...shadows.soft,
  },
  row: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowPressed: { backgroundColor: colors.surfaceSubtle },
  rowIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCopy: { flex: 1, gap: spacing.xs },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 60, backgroundColor: colors.border },
  boundary: { paddingHorizontal: spacing.xs, paddingTop: spacing.sm },
});
