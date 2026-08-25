import type { ReactNode } from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react-native';

import { medicationAppearancePalette } from '@/models/medication';
import { AppearanceStep, appearanceColorSummary } from '@/ui/components/medicine-appearance-field';

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

jest.mock('@/ui/components/medication-color-picker', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    MedicationColorPicker: ({
      label,
      onChange,
    }: {
      label: string;
      onChange: (value: string) => void;
    }) =>
      React.createElement(
        Pressable,
        {
          accessibilityRole: 'button',
          accessibilityLabel: label,
          onPress: () => onChange('#123456'),
        },
        React.createElement(Text, null, label),
      ),
  };
});

jest.mock('@/ui/components/pilly-dialog', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { Text, View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    PillyDialog: ({
      visible,
      title,
      children,
    }: {
      visible: boolean;
      title: string;
      children: ReactNode;
    }) =>
      visible
        ? React.createElement(
            View,
            null,
            React.createElement(Text, null, title),
            children,
          )
        : null,
  };
});

describe('medicine appearance field', () => {
  afterEach(cleanup);

  test('describes preset and custom colors without generic copy', () => {
    expect(
      appearanceColorSummary(
        'capsule',
        medicationAppearancePalette.rose,
        medicationAppearancePalette.peach,
      ),
    ).toBe('Rose + Peach');
    expect(appearanceColorSummary('round', '#123456', medicationAppearancePalette.peach)).toBe(
      'Custom',
    );
  });

  test('routes the picker to each capsule half', async () => {
    const onColorChange = jest.fn();
    const onSecondaryColorChange = jest.fn();
    const screen = await render(
      <AppearanceStep
        shape="capsule"
        size="medium"
        color={medicationAppearancePalette.rose}
        secondaryColor={medicationAppearancePalette.peach}
        onShapeChange={jest.fn()}
        onColorChange={onColorChange}
        onSecondaryColorChange={onSecondaryColorChange}
      />,
    );

    await fireEvent.press(screen.getByLabelText('Edit pill appearance'));

    expect(screen.getByText('Pill appearance')).toBeOnTheScreen();
    expect(screen.getByLabelText('Choose color')).toBeOnTheScreen();
    await fireEvent.press(screen.getByLabelText('Choose color'));
    await fireEvent.press(screen.getByLabelText('Edit right half color'));
    await fireEvent.press(screen.getByLabelText('Choose color'));

    expect(onColorChange).toHaveBeenCalledWith('#123456');
    expect(onSecondaryColorChange).toHaveBeenCalledWith('#123456');
    expect(screen.queryByLabelText('Color 1: Lavender')).not.toBeOnTheScreen();
  });

  test('uses a single color target for tablets', async () => {
    const onColorChange = jest.fn();
    const screen = await render(
      <AppearanceStep
        shape="round"
        size="large"
        color={medicationAppearancePalette.rose}
        secondaryColor={medicationAppearancePalette.peach}
        onShapeChange={jest.fn()}
        onColorChange={onColorChange}
        onSecondaryColorChange={jest.fn()}
      />,
    );

    await fireEvent.press(screen.getByLabelText('Edit pill appearance'));
    await fireEvent.press(screen.getByLabelText('Choose color'));

    expect(onColorChange).toHaveBeenCalledWith('#123456');
    expect(screen.queryByLabelText('Edit left half color')).not.toBeOnTheScreen();
    expect(screen.queryByLabelText('Edit right half color')).not.toBeOnTheScreen();
  });
});
