import { ActionSheetIOS, Alert, Platform } from 'react-native';

export type PhotoSource = 'camera' | 'library';

export function showPhotoSourceMenu(
  title: string,
  onSelect: (source: PhotoSource) => void,
  onRemove?: () => void,
): void {
  if (Platform.OS === 'ios') {
    const options = onRemove
      ? ['Take photo', 'Choose from library', 'Remove photo', 'Cancel']
      : ['Take photo', 'Choose from library', 'Cancel'];
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex: options.length - 1,
        destructiveButtonIndex: onRemove ? 2 : undefined,
        title,
      },
      (index) => {
        if (index === 0) onSelect('camera');
        if (index === 1) onSelect('library');
        if (index === 2 && onRemove) onRemove();
      },
    );
    return;
  }
  Alert.alert(title, undefined, [
    { text: 'Take photo', onPress: () => onSelect('camera') },
    { text: 'Choose from library', onPress: () => onSelect('library') },
    ...(onRemove
      ? [{ text: 'Remove photo', style: 'destructive' as const, onPress: onRemove }]
      : []),
    { text: 'Cancel', style: 'cancel' },
  ]);
}
