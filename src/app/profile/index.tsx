import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';

import { PillyBanner } from '@/ui/components/pilly-banner';
import { PillyField } from '@/ui/components/pilly-field';
import { PillyModal } from '@/ui/components/pilly-modal';
import { PillyText } from '@/ui/components/pilly-text';
import { Screen } from '@/ui/components/screen';
import { PillyIcon, type PillyIconName } from '@/ui/icons';
import { colors, radii, shadows, spacing } from '@/ui/tokens';
import { useAccountSession } from '@/hooks/use-account-session';
import { useProfile } from '@/hooks/use-profile';
import { isPlusPurchasesSupported } from '@/services/purchases';

export default function ProfileRoute() {
  const account = useAccountSession();
  const profile = useProfile();
  const plusSupported = isPlusPurchasesSupported();
  const [nameModalOpen, setNameModalOpen] = useState(false);
  const [firstNameDraft, setFirstNameDraft] = useState('');
  const [lastNameDraft, setLastNameDraft] = useState('');
  const [websiteError, setWebsiteError] = useState(false);
  const websiteUrl = process.env.EXPO_PUBLIC_WEBSITE_URL?.startsWith('https://')
    ? process.env.EXPO_PUBLIC_WEBSITE_URL
    : null;
  const archivedMessage = `${profile.archivedCount} ${profile.archivedCount === 1 ? 'medicine' : 'medicines'}`;

  const openNameEditor = () => {
    setFirstNameDraft(profile.name.firstName);
    setLastNameDraft(profile.name.lastName);
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
  return (
    <>
      <Screen
        safeAreaEdges={['bottom']}
        contentInsetAdjustmentBehavior="never"
        contentStyle={styles.screen}
      >
        <View style={styles.identity}>
          <View style={styles.identityHeader}>
            {profile.isLoading ? (
              <View style={styles.loadingName}>
                <ActivityIndicator color={colors.brand} />
                <PillyText role="caption" muted>
                  Loading profile…
                </PillyText>
              </View>
            ) : (
              <PillyText role="title" accessibilityRole="header" style={styles.name}>
                {profile.displayName || 'Your Pilly'}
              </PillyText>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit name"
              disabled={profile.isLoading}
              hitSlop={6}
              onPress={openNameEditor}
              style={({ pressed }) => [
                styles.editName,
                pressed && styles.pressed,
                profile.isLoading && styles.disabled,
              ]}
            >
              <PillyText role="label" style={styles.editNameLabel}>
                Edit name
              </PillyText>
            </Pressable>
          </View>
          <PillyText muted>
            {account.state.kind === 'signed-in'
              ? `Pilly Plus account · ${account.state.user.email}`
              : 'Medicine tracking stays on this iPhone.'}
          </PillyText>
        </View>

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
                title="Pilly Plus account"
                message="Manage your connected account"
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

      <PillyModal
        visible={nameModalOpen}
        title="Edit name"
        confirmLabel="Save"
        confirmLoading={profile.saveName.isPending}
        onConfirm={() =>
          profile.saveName.mutate(
            { firstName: firstNameDraft, lastName: lastNameDraft },
            { onSuccess: () => setNameModalOpen(false) },
          )
        }
        onClose={() => setNameModalOpen(false)}
      >
        <View style={styles.nameFields}>
          <PillyField
            testID="profile-first-name"
            label="First name"
            value={firstNameDraft}
            onChangeText={setFirstNameDraft}
            placeholder="First name"
            autoCapitalize="words"
            maxLength={40}
          />
          <PillyField
            label="Last name"
            optional
            value={lastNameDraft}
            onChangeText={setLastNameDraft}
            placeholder="Last name"
            autoCapitalize="words"
            maxLength={40}
          />
          {profile.saveName.isError ? (
            <PillyBanner kind="error" message="Couldn’t save your name." compact />
          ) : null}
        </View>
      </PillyModal>
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
  identity: {
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
  },
  identityHeader: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  loadingName: {
    flex: 1,
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: { flex: 1, fontWeight: '600' },
  editName: {
    minHeight: 44,
    justifyContent: 'flex-start',
    paddingHorizontal: spacing.sm,
  },
  editNameLabel: { color: colors.brand },
  pressed: { opacity: 0.68 },
  disabled: { opacity: 0.4 },
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
  nameFields: { gap: spacing.lg },
});
