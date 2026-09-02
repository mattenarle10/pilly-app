import { cleanup, fireEvent, render } from '@testing-library/react-native';
import { ActionSheetIOS } from 'react-native';

import { MedicinePhotoField } from '@/ui/components/medicine-photo-field';

jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    __esModule: true,
    default: { View, createAnimatedComponent: (component: unknown) => component },
    ReduceMotion: { System: 'system' },
    useAnimatedStyle: (updater: () => object) => updater(),
    useSharedValue: (value: unknown) => ({ value }),
    withTiming: (value: unknown) => value,
  };
});

describe('medicine photo field', () => {
  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

  test('offers the camera and photo library from the empty state', async () => {
    const onSelect = jest.fn();
    jest
      .spyOn(ActionSheetIOS, 'showActionSheetWithOptions')
      .mockImplementationOnce((_options, callback) => callback(0))
      .mockImplementationOnce((_options, callback) => callback(1));
    const screen = await render(
      <MedicinePhotoField uri={null} busy={false} onSelect={onSelect} onRemove={jest.fn()} />,
    );

    expect(screen.getByText('Optional photo to help recognize this medicine.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByLabelText('Add photo'));
    await fireEvent.press(screen.getByLabelText('Add photo'));
    expect(onSelect).toHaveBeenNthCalledWith(1, 'camera');
    expect(onSelect).toHaveBeenNthCalledWith(2, 'library');
  });

  test('shows one preview with change and remove actions', async () => {
    const onSelect = jest.fn();
    const onRemove = jest.fn();
    jest
      .spyOn(ActionSheetIOS, 'showActionSheetWithOptions')
      .mockImplementation((_options, callback) => callback(1));
    const screen = await render(
      <MedicinePhotoField
        uri="file:///private/photo.jpg"
        busy={false}
        onSelect={onSelect}
        onRemove={onRemove}
      />,
    );

    expect(screen.getByLabelText('Medicine recognition photo')).toBeOnTheScreen();
    await fireEvent.press(screen.getByLabelText('Change photo'));
    await fireEvent.press(screen.getByLabelText('Remove'));
    expect(onSelect).toHaveBeenCalledWith('library');
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  test('keeps the preview stable and replaces actions with quiet progress while busy', async () => {
    const screen = await render(
      <MedicinePhotoField
        uri="file:///private/photo.jpg"
        busy
        onSelect={jest.fn()}
        onRemove={jest.fn()}
      />,
    );

    expect(screen.getByLabelText('Medicine recognition photo')).toBeOnTheScreen();
    expect(screen.getByLabelText('Updating medicine photo')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Change photo')).toBeNull();
    expect(screen.queryByLabelText('Remove')).toBeNull();
  });
});
