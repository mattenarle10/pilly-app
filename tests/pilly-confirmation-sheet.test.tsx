import { cleanup, fireEvent, render } from '@testing-library/react-native';

import { PillyConfirmationSheet } from '@/ui/components/pilly-confirmation-sheet';

jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    __esModule: true,
    default: { View, createAnimatedComponent: (component: unknown) => component },
    ReduceMotion: { System: 'system' },
    SlideInDown: { duration: () => ({ reduceMotion: () => undefined }) },
    useAnimatedStyle: (updater: () => object) => updater(),
    useSharedValue: (value: unknown) => ({ value }),
    withTiming: (value: unknown) => value,
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

describe('PillyConfirmationSheet', () => {
  afterEach(cleanup);

  test('locks every dismissal path while a confirmation is running', async () => {
    const onClose = jest.fn();
    const screen = await render(
      <PillyConfirmationSheet
        visible
        title="Delete medicine?"
        confirmLabel="Delete"
        confirmLoading
        onConfirm={jest.fn()}
        onClose={onClose}
      />,
    );

    expect(screen.getByLabelText('Close')).toBeDisabled();
    expect(screen.getByLabelText('Cancel')).toBeDisabled();
    expect(screen.getByLabelText('Delete')).toBeDisabled();

    await fireEvent.press(screen.getByLabelText('Close sheet', { includeHiddenElements: true }));
    await fireEvent.press(screen.getByLabelText('Close'));
    await fireEvent.press(screen.getByLabelText('Cancel'));

    expect(onClose).not.toHaveBeenCalled();
  });
});
