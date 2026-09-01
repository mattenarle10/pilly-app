import { cleanup, fireEvent, render } from '@testing-library/react-native';

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
  afterEach(cleanup);

  test('keeps the unavailable state quiet and routes to Pilly Plus', async () => {
    const onOpenPlus = jest.fn();
    const screen = await render(
      <MedicinePhotoField
        uri={null}
        available={false}
        busy={false}
        onSelect={jest.fn()}
        onRemove={jest.fn()}
        onOpenPlus={onOpenPlus}
      />,
    );

    expect(screen.getByText('Available with Pilly Plus.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByLabelText('See Pilly Plus'));
    expect(onOpenPlus).toHaveBeenCalledTimes(1);
  });

  test('shows one private preview with replace and remove actions', async () => {
    const onSelect = jest.fn();
    const onRemove = jest.fn();
    const screen = await render(
      <MedicinePhotoField
        uri="file:///private/photo.jpg"
        available
        busy={false}
        onSelect={onSelect}
        onRemove={onRemove}
        onOpenPlus={jest.fn()}
      />,
    );

    expect(screen.getByLabelText('Medicine recognition photo')).toBeOnTheScreen();
    await fireEvent.press(screen.getByLabelText('Replace'));
    await fireEvent.press(screen.getByLabelText('Remove'));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
