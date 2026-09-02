import { cleanup, fireEvent, render } from '@testing-library/react-native';

import { medicationAppearancePalette } from '@/models/medication';
import { MedicineTypeStep, medicineTypeSummary } from '@/ui/components/medicine-appearance-field';

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

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

describe('medicine type field', () => {
  afterEach(cleanup);

  test('describes preset and custom colors without generic copy', () => {
    expect(
      medicineTypeSummary({
        form: 'capsule',
        tabletShape: 'round',
        color: medicationAppearancePalette.rose,
        secondaryColor: medicationAppearancePalette.peach,
      }),
    ).toBe('Capsule · Rose + Peach');
    expect(
      medicineTypeSummary({
        form: 'tablet',
        tabletShape: 'round',
        color: '#123456',
        secondaryColor: medicationAppearancePalette.peach,
      }),
    ).toBe('Tablet · Round · Custom');
  });

  test('uses the compact editor treatment and routes colors to each capsule half', async () => {
    const onColorChange = jest.fn();
    const onSecondaryColorChange = jest.fn();
    const screen = await render(
      <MedicineTypeStep
        form="capsule"
        tabletShape="round"
        size="medium"
        color={medicationAppearancePalette.rose}
        secondaryColor={medicationAppearancePalette.peach}
        onFormChange={jest.fn()}
        onTabletShapeChange={jest.fn()}
        onColorChange={onColorChange}
        onSecondaryColorChange={onSecondaryColorChange}
      />,
    );

    await fireEvent.press(screen.getByLabelText('Edit medicine type'));

    expect(screen.getAllByText('Medicine type')).toHaveLength(2);
    expect(screen.getByLabelText('Done')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Close')).not.toBeOnTheScreen();
    expect(screen.queryByText('Drag to rotate')).not.toBeOnTheScreen();
    expect(screen.getByLabelText('Choose color')).toBeOnTheScreen();
    expect(screen.getByLabelText('Liquid')).toBeOnTheScreen();
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
      <MedicineTypeStep
        form="tablet"
        tabletShape="round"
        size="large"
        color={medicationAppearancePalette.rose}
        secondaryColor={medicationAppearancePalette.peach}
        onFormChange={jest.fn()}
        onTabletShapeChange={jest.fn()}
        onColorChange={onColorChange}
        onSecondaryColorChange={jest.fn()}
      />,
    );

    await fireEvent.press(screen.getByLabelText('Edit medicine type'));
    await fireEvent.press(screen.getByLabelText('Choose color'));

    expect(onColorChange).toHaveBeenCalledWith('#123456');
    expect(screen.queryByText('Drag to rotate')).not.toBeOnTheScreen();
    expect(screen.queryByLabelText('Edit left half color')).not.toBeOnTheScreen();
    expect(screen.queryByLabelText('Edit right half color')).not.toBeOnTheScreen();
  });

  test('offers all supported forms without exposing the compatibility fallback', async () => {
    const onFormChange = jest.fn();
    const screen = await render(
      <MedicineTypeStep
        form="other"
        tabletShape="round"
        size="medium"
        color={medicationAppearancePalette.rose}
        secondaryColor={medicationAppearancePalette.peach}
        onFormChange={onFormChange}
        onTabletShapeChange={jest.fn()}
        onColorChange={jest.fn()}
        onSecondaryColorChange={jest.fn()}
      />,
    );

    await fireEvent.press(screen.getByLabelText('Edit medicine type'));
    await fireEvent.press(screen.getByLabelText('Inhaler'));

    expect(onFormChange).toHaveBeenCalledWith('inhaler');
    expect(screen.queryByLabelText('Other')).not.toBeOnTheScreen();
  });
});
