import { cleanup, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { PropsWithChildren } from 'react';

import { ProfileNameDialog } from '@/ui/components/profile-name-dialog';

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

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function wrapper({ children }: PropsWithChildren) {
  return <SafeAreaProvider initialMetrics={initialMetrics}>{children}</SafeAreaProvider>;
}

describe('ProfileNameDialog', () => {
  afterEach(async () => {
    await cleanup();
  });

  test('loads the current name and saves a normalized change', async () => {
    const onSave = jest.fn();
    const screen = await render(
      <ProfileNameDialog
        name={{ firstName: 'Ada', lastName: 'Lovelace' }}
        saving={false}
        saveError={false}
        onSave={onSave}
        onResetError={jest.fn()}
        onClose={jest.fn()}
      />,
      { wrapper },
    );

    expect(screen.getByDisplayValue('Ada')).toBeOnTheScreen();
    expect(screen.getByDisplayValue('Lovelace')).toBeOnTheScreen();
    expect(screen.getByLabelText('Save')).toBeDisabled();

    await fireEvent.changeText(screen.getByLabelText('First name'), '  Grace  ');
    await fireEvent.press(screen.getByLabelText('Save'));

    expect(onSave).toHaveBeenCalledWith({ firstName: 'Grace', lastName: 'Lovelace' });
  });

  test('moves from first to last name and lets the keyboard submit', async () => {
    const onSave = jest.fn();
    const screen = await render(
      <ProfileNameDialog
        name={{ firstName: '', lastName: '' }}
        saving={false}
        saveError={false}
        onSave={onSave}
        onResetError={jest.fn()}
        onClose={jest.fn()}
      />,
      { wrapper },
    );
    const firstName = screen.getByLabelText('First name');
    const lastName = screen.getByLabelText('Last name');

    await fireEvent.changeText(firstName, 'Ada');
    await fireEvent(firstName, 'submitEditing');
    expect(lastName).toHaveProp('enterKeyHint', 'done');
    await fireEvent(lastName, 'submitEditing');

    expect(onSave).toHaveBeenCalledWith({ firstName: 'Ada', lastName: '' });
  });

  test('allows an optional local name to be cleared', async () => {
    const onSave = jest.fn();
    const screen = await render(
      <ProfileNameDialog
        name={{ firstName: 'Ada', lastName: 'Lovelace' }}
        saving={false}
        saveError={false}
        onSave={onSave}
        onResetError={jest.fn()}
        onClose={jest.fn()}
      />,
      { wrapper },
    );

    await fireEvent.changeText(screen.getByLabelText('First name'), '');
    await fireEvent.changeText(screen.getByLabelText('Last name'), '');
    await fireEvent.press(screen.getByLabelText('Save'));

    expect(onSave).toHaveBeenCalledWith({ firstName: '', lastName: '' });
  });

  test('keeps a failed draft visible and clears the obsolete error when editing', async () => {
    const onResetError = jest.fn();
    const screen = await render(
      <ProfileNameDialog
        name={{ firstName: 'Ada', lastName: '' }}
        saving={false}
        saveError
        onSave={jest.fn()}
        onResetError={onResetError}
        onClose={jest.fn()}
      />,
      { wrapper },
    );

    expect(screen.getByText(/current name is unchanged/i)).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('Last name'), 'Lovelace');
    expect(onResetError).toHaveBeenCalledTimes(1);
    expect(screen.getByDisplayValue('Lovelace')).toBeOnTheScreen();
  });

  test('locks dismissal and fields while saving', async () => {
    const onClose = jest.fn();
    const screen = await render(
      <ProfileNameDialog
        name={{ firstName: 'Ada', lastName: '' }}
        saving
        saveError={false}
        onSave={jest.fn()}
        onResetError={jest.fn()}
        onClose={onClose}
      />,
      { wrapper },
    );

    expect(screen.getByLabelText('First name')).toBeDisabled();
    expect(screen.getByLabelText('Cancel')).toBeDisabled();
    await fireEvent.press(screen.getByLabelText('Close dialog', { includeHiddenElements: true }));
    expect(onClose).not.toHaveBeenCalled();
  });
});
