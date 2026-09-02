import { ActionSheetIOS, Alert, Platform } from 'react-native';

export type PhotoSource = 'camera' | 'library';

export function showPhotoSourceMenu(title: string, onSelect: (source: PhotoSource) => void): void {
  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ['Take photo', 'Choose from library', 'Cancel'],
        cancelButtonIndex: 2,
        title,
      },
      (index) => {
        if (index === 0) onSelect('camera');
        if (index === 1) onSelect('library');
      },
    );
    return;
  }
  Alert.alert(title, undefined, [
    { text: 'Take photo', onPress: () => onSelect('camera') },
    { text: 'Choose from library', onPress: () => onSelect('library') },
    { text: 'Cancel', style: 'cancel' },
  ]);
}
