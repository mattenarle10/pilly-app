import { useRef, useState } from 'react';
import { Keyboard, StyleSheet, TextInput, View } from 'react-native';

import type { ProfileName } from '@/models/profile';
import { spacing } from '@/ui/tokens';

import { PillyBanner } from './pilly-banner';
import { PillyDialog } from './pilly-dialog';
import { PillyField } from './pilly-field';

type Props = {
  name: ProfileName;
  saving: boolean;
  saveError: boolean;
  onSave: (name: ProfileName) => void;
  onResetError: () => void;
  onClose: () => void;
};

export function ProfileNameDialog({
  name,
  saving,
  saveError,
  onSave,
  onResetError,
  onClose,
}: Props) {
  const firstNameRef = useRef<TextInput>(null);
  const lastNameRef = useRef<TextInput>(null);
  const [firstName, setFirstName] = useState(name.firstName);
  const [lastName, setLastName] = useState(name.lastName);
  const normalizedDraft = { firstName: firstName.trim(), lastName: lastName.trim() };
  const normalizedName = { firstName: name.firstName.trim(), lastName: name.lastName.trim() };
  const dirty =
    normalizedDraft.firstName !== normalizedName.firstName ||
    normalizedDraft.lastName !== normalizedName.lastName;

  const close = () => {
    if (saving) return;
    Keyboard.dismiss();
    onClose();
  };
  const save = () => {
    if (!dirty || saving) {
      Keyboard.dismiss();
      return;
    }
    onSave(normalizedDraft);
  };
  const updateFirstName = (value: string) => {
    if (saveError) onResetError();
    setFirstName(value);
  };
  const updateLastName = (value: string) => {
    if (saveError) onResetError();
    setLastName(value);
  };

  return (
    <PillyDialog
      visible
      title="Edit name"
      dismissible={!saving}
      keyboardAware
      onClose={close}
      onShow={() => firstNameRef.current?.focus()}
      actions={[
        {
          label: 'Cancel',
          variant: 'secondary',
          disabled: saving,
          onPress: close,
        },
        {
          label: 'Save',
          loading: saving,
          disabled: !dirty,
          onPress: save,
        },
      ]}
    >
      <View style={styles.fields}>
        <PillyField
          ref={firstNameRef}
          testID="profile-first-name"
          label="First name"
          value={firstName}
          editable={!saving}
          onChangeText={updateFirstName}
          onSubmitEditing={() => lastNameRef.current?.focus()}
          placeholder="First name"
          autoCapitalize="words"
          autoComplete="given-name"
          enterKeyHint="next"
          submitBehavior="submit"
          maxLength={40}
        />
        <PillyField
          ref={lastNameRef}
          testID="profile-last-name"
          label="Last name"
          optional
          value={lastName}
          editable={!saving}
          onChangeText={updateLastName}
          onSubmitEditing={save}
          placeholder="Last name"
          autoCapitalize="words"
          autoComplete="family-name"
          enterKeyHint="done"
          submitBehavior="blurAndSubmit"
          maxLength={40}
        />
        {saveError ? (
          <PillyBanner
            kind="error"
            message="Couldn’t save your name. Your current name is unchanged."
            compact
          />
        ) : null}
      </View>
    </PillyDialog>
  );
}

const styles = StyleSheet.create({
  fields: { gap: spacing.lg },
});
