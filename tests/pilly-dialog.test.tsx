import { cleanup, fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { PillyDialog } from '@/ui/components/pilly-dialog';
import { PillyText } from '@/ui/components/pilly-text';

jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    __esModule: true,
    default: { View, createAnimatedComponent: (component: unknown) => component },
    ReduceMotion: { System: 'system' },
    useAnimatedStyle: (updater: () => object) => updater(),
    useReducedMotion: () => true,
    useSharedValue: (value: unknown) => ({ value }),
    withTiming: (value: unknown) => value,
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

describe('PillyDialog', () => {
  afterEach(cleanup);

  test('uses an intrinsic non-bouncing body and its default close action', async () => {
    const onClose = jest.fn();
    const screen = await render(
      <PillyDialog visible title="Details" onClose={onClose}>
        <PillyText>Dialog content</PillyText>
      </PillyDialog>,
    );

    const dialogStyle = StyleSheet.flatten(screen.getByTestId('pilly-dialog').props.style);
    const body = screen.getByTestId('pilly-dialog-body');

    expect(dialogStyle.height).toBeUndefined();
    expect(dialogStyle.maxHeight).toBe('84%');
    expect(body.props.alwaysBounceVertical).toBe(false);
    expect(body.props.bounces).toBe(false);

    await fireEvent.press(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('moves a supplied completion action to the footer', async () => {
    const onClose = jest.fn();
    const onDone = jest.fn();
    const screen = await render(
      <PillyDialog
        visible
        title="Pill appearance"
        onClose={onClose}
        footerAction={{ label: 'Done', onPress: onDone }}
      >
        <PillyText>Appearance controls</PillyText>
      </PillyDialog>,
    );

    expect(screen.queryByLabelText('Close')).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByLabelText('Done'));
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByLabelText('Close dialog', { includeHiddenElements: true }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
