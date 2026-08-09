import { useState } from 'react';
import { Alert, Image, Linking, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  normalizeProfileName,
  profileDisplayName,
  profileSettingKeys,
  resolveProfileName,
} from '@/domain/profile';

import {
  PillyBanner,
  PillyField,
  PillyIconButton,
  PillyIconTile,
  PillyModal,
  PillyText,
  Screen,
} from '@/design/components';
import { PillyIcon, type PillyIconName } from '@/design/icons';
import { colors, spacing } from '@/design/tokens';
import { deleteLocalProfilePhoto, pickLocalProfilePhoto } from '@/platform/profile-photo';
import { useRepository } from '@/hooks';

export function ProfileScreen() {
  const repository = useRepository();
  const queryClient = useQueryClient();
  const [nameModalOpen, setNameModalOpen] = useState(false);
  const [firstNameDraft, setFirstNameDraft] = useState('');
  const [lastNameDraft, setLastNameDraft] = useState('');
  const [websiteError, setWebsiteError] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const profileName = useQuery({
    queryKey: ['settings', profileSettingKeys.displayName],
    queryFn: () => repository.getSetting(profileSettingKeys.displayName),
    networkMode: 'always',
  });
  const profileFirstName = useQuery({
    queryKey: ['settings', profileSettingKeys.firstName],
    queryFn: () => repository.getSetting(profileSettingKeys.firstName),
    networkMode: 'always',
  });
  const profileLastName = useQuery({
    queryKey: ['settings', profileSettingKeys.lastName],
    queryFn: () => repository.getSetting(profileSettingKeys.lastName),
    networkMode: 'always',
  });
  const profilePhoto = useQuery({
    queryKey: ['settings', profileSettingKeys.photoUri],
    queryFn: () => repository.getSetting(profileSettingKeys.photoUri),
    networkMode: 'always',
  });
  const resolvedName = resolveProfileName({
    firstName: profileFirstName.data,
    lastName: profileLastName.data,
    legacyDisplayName: profileName.data,
  });
  const { firstName, lastName } = resolvedName;
  const name = profileDisplayName(resolvedName);
  const saveName = useMutation({
    mutationFn: async ({ first, last }: { first: string; last: string }) => {
      const normalized = normalizeProfileName({ firstName: first, lastName: last });
      await Promise.all([
        repository.setSetting(profileSettingKeys.firstName, normalized.firstName),
        repository.setSetting(profileSettingKeys.lastName, normalized.lastName),
        repository.setSetting(profileSettingKeys.displayName, profileDisplayName(normalized)),
      ]);
      return normalized;
    },
    networkMode: 'always',
    onSuccess: (normalized) => {
      queryClient.setQueryData(['settings', profileSettingKeys.firstName], normalized.firstName);
      queryClient.setQueryData(['settings', profileSettingKeys.lastName], normalized.lastName);
      queryClient.setQueryData(
        ['settings', profileSettingKeys.displayName],
        profileDisplayName(normalized),
      );
      setNameModalOpen(false);
    },
  });
  const medicines = useQuery({
    queryKey: ['medications', 'all'],
    queryFn: () => repository.listMedications({ includeArchived: true }),
    networkMode: 'always',
  });
  const archivedCount = medicines.data?.filter((medicine) => medicine.archivedAt).length ?? 0;
  const websiteUrl = process.env.EXPO_PUBLIC_WEBSITE_URL?.startsWith('https://')
    ? process.env.EXPO_PUBLIC_WEBSITE_URL
    : null;
  const openWebsite = async () => {
    if (!websiteUrl) return;
    setWebsiteError(false);
    try {
      await Linking.openURL(websiteUrl);
    } catch {
      setWebsiteError(true);
    }
  };
  const choosePhoto = async () => {
    setPhotoError(false);
    setPhotoBusy(true);
    try {
      const destinationUri = await pickLocalProfilePhoto();
      if (!destinationUri) return;
      const previousUri = profilePhoto.data;
      try {
        await repository.setSetting(profileSettingKeys.photoUri, destinationUri);
        queryClient.setQueryData(['settings', profileSettingKeys.photoUri], destinationUri);
        deleteLocalProfilePhoto(previousUri);
      } catch (error) {
        deleteLocalProfilePhoto(destinationUri);
        throw error;
      }
    } catch {
      setPhotoError(true);
    } finally {
      setPhotoBusy(false);
    }
  };
  const removePhoto = async () => {
    const photoUri = profilePhoto.data;
    if (!photoUri) return;
    setPhotoBusy(true);
    setPhotoError(false);
    try {
      await repository.setSetting(profileSettingKeys.photoUri, '');
      queryClient.setQueryData(['settings', profileSettingKeys.photoUri], '');
      deleteLocalProfilePhoto(photoUri);
    } catch {
      setPhotoError(true);
    } finally {
      setPhotoBusy(false);
    }
  };
  const openPhotoMenu = () => {
    if (!profilePhoto.data) {
      void choosePhoto();
      return;
    }
    Alert.alert('Profile photo', undefined, [
      { text: 'Choose another', onPress: () => void choosePhoto() },
      { text: 'Remove photo', style: 'destructive', onPress: () => void removePhoto() },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };
  const openNameEditor = () => {
    setFirstNameDraft(firstName);
    setLastNameDraft(lastName);
    saveName.reset();
    setNameModalOpen(true);
  };
  return (
    <Screen contentStyle={styles.screen}>
      <View style={styles.header}>
        <PillyIconButton icon="back" label="Back" onPress={() => router.back()} />
        <PillyText role="title" accessibilityRole="header">
          Profile
        </PillyText>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.identity}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={profilePhoto.data ? 'Change profile photo' : 'Add profile photo'}
            accessibilityState={{ busy: photoBusy }}
            disabled={photoBusy}
            onPress={openPhotoMenu}
            style={({ pressed }) => [styles.profileMark, pressed && styles.photoPressed]}
          >
            {profilePhoto.data ? (
              <Image source={{ uri: profilePhoto.data }} resizeMode="cover" style={styles.photo} />
            ) : (
              <PillyIcon name="profile" size={34} color={colors.brand} />
            )}
            <View style={styles.photoBadge}>
              <PillyIcon name="edit" size={13} color={colors.surface} />
            </View>
          </Pressable>
          <View style={styles.copy}>
            <View style={styles.nameRow}>
              <PillyText role="title" style={styles.name}>
                {name || 'Your Pilly'}
              </PillyText>
              <PillyIconButton icon="edit" label="Edit name" onPress={openNameEditor} />
            </View>
            <PillyText role="caption" muted>
              Personal to this iPhone.
            </PillyText>
          </View>
        </View>
        <View style={styles.profileFacts}>
          <ProfileFact icon="phone" label="On-device" />
          <ProfileFact icon="reminder" label="Names hidden" />
        </View>
        {photoError ? (
          <PillyBanner kind="error" message="Couldn’t save that photo." compact />
        ) : null}
      </View>

      {medicines.isError ? (
        <PillyBanner kind="error" message="Couldn’t load local settings." compact />
      ) : null}
      <View style={styles.section}>
        <PillyText role="headline">Manage</PillyText>
        <SettingRow
          icon="archive"
          title="Archived medicines"
          message={
            archivedCount === 0
              ? 'Nothing archived.'
              : `${archivedCount} ${archivedCount === 1 ? 'medicine' : 'medicines'}.`
          }
          onPress={() => router.push('/(tabs)/medicines')}
        />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Try Pilly Plus"
        onPress={() => router.push('/plus')}
        style={({ pressed }) => [styles.plusCard, pressed && styles.rowPressed]}
      >
        {({ pressed }) => (
          <>
            <PillyIconTile icon="palette" tone="lavender" size="large" />
            <View style={styles.copy}>
              <PillyText role="headline">Try Pilly Plus</PillyText>
              <PillyText role="caption" muted>
                Themes, print, and export.
              </PillyText>
            </View>
            <PillyIcon name="next" size={20} color={colors.brand} active={pressed} />
          </>
        )}
      </Pressable>
      <View style={styles.section}>
        <PillyText role="headline">About</PillyText>
        <SettingRow
          icon="website"
          title="About Pilly"
          message={`Version ${Constants.expoConfig?.version ?? '1.0.0'}`}
          onPress={websiteUrl ? () => void openWebsite() : undefined}
        />
        {websiteError ? (
          <PillyBanner kind="error" message="Couldn’t open the website." compact />
        ) : null}
      </View>
      <PillyText role="caption" muted style={styles.boundary}>
        Pilly records what you enter. It does not give medical advice.
      </PillyText>
      <PillyModal
        visible={nameModalOpen}
        title="Edit name"
        confirmLabel="Save"
        confirmLoading={saveName.isPending}
        onConfirm={() => saveName.mutate({ first: firstNameDraft, last: lastNameDraft })}
        onClose={() => setNameModalOpen(false)}
      >
        <View style={styles.nameFields}>
          <PillyField
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
          {saveName.isError ? (
            <PillyBanner kind="error" message="Couldn’t save your name." compact />
          ) : null}
        </View>
      </PillyModal>
    </Screen>
  );
}

function ProfileFact({ icon, label }: { icon: 'phone' | 'reminder'; label: string }) {
  return (
    <View style={styles.profileFact}>
      <PillyIcon name={icon} size={15} color={colors.textSecondary} />
      <PillyText role="caption" muted>
        {label}
      </PillyText>
    </View>
  );
}

function SettingRow({
  icon,
  title,
  message,
  tone,
  onPress,
}: {
  icon: PillyIconName;
  title: string;
  message: string;
  tone?: 'brand' | 'peach' | 'lavender';
  onPress?: () => void;
}) {
  const content = (
    <>
      <PillyIconTile icon={icon} tone={tone} />
      <View style={styles.copy}>
        <PillyText role="headline">{title}</PillyText>
        <PillyText role="caption" muted>
          {message}
        </PillyText>
      </View>
      {onPress ? <PillyIcon name="next" size={20} color={colors.textSecondary} /> : null}
    </>
  );
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      {content}
    </Pressable>
  ) : (
    <View style={styles.row}>{content}</View>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.lg },
  header: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  profileCard: {
    borderRadius: 24,
    padding: spacing.lg,
    gap: spacing.lg,
    backgroundColor: colors.lavenderSoft,
  },
  identity: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  nameRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  name: { flex: 1 },
  nameFields: { gap: spacing.lg },
  profileMark: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brandSoft,
    overflow: 'visible',
  },
  photo: { width: 56, height: 56, borderRadius: 28 },
  photoPressed: { opacity: 0.76, transform: [{ scale: 0.96 }] },
  photoBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand,
    borderWidth: 2,
    borderColor: colors.lavenderSoft,
  },
  profileFacts: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  profileFact: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    backgroundColor: colors.glass,
  },
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 20,
    backgroundColor: colors.glass,
  },
  rowPressed: { opacity: 0.76, transform: [{ scale: 0.99 }] },
  plusCard: {
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 24,
    backgroundColor: colors.lavenderSoft,
  },
  copy: { flex: 1, gap: spacing.xs },
  section: { gap: spacing.sm },
  boundary: { textAlign: 'center' },
});
