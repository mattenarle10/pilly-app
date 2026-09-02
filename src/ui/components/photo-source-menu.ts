import { ActionSheetIOS, Alert, Platform } from 'react-native';

export type PhotoSource = 'camera' | 'library';

type PhotoSourceMenuOptions = {
  title: string;
  onSelect?: (source: PhotoSource) => void;
  onRemove?: () => void;
};

export function showPhotoSourceMenu({ title, onSelect, onRemove }: PhotoSourceMenuOptions): void {
  const actions = [
    ...(onSelect
      ? [
          { label: 'Take photo', onPress: () => onSelect('camera') },
          { label: 'Choose from library', onPress: () => onSelect('library') },
        ]
      : []),
    ...(onRemove ? [{ label: 'Remove photo', onPress: onRemove, destructive: true }] : []),
  ];

  if (Platform.OS === 'ios') {
    const options = [...actions.map((action) => action.label), 'Cancel'];
    const destructiveButtonIndex = actions.findIndex((action) => action.destructive);
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex: options.length - 1,
        destructiveButtonIndex: destructiveButtonIndex >= 0 ? destructiveButtonIndex : undefined,
        title,
      },
      (index) => {
        actions[index]?.onPress();
      },
    );
    return;
  }
  Alert.alert(title, undefined, [
    ...actions.map((action) => ({
      text: action.label,
      style: action.destructive ? ('destructive' as const) : ('default' as const),
      onPress: action.onPress,
    })),
    { text: 'Cancel', style: 'cancel' },
  ]);
}
