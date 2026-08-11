import { cleanup, fireEvent, render } from '@testing-library/react-native';

import type { Medication } from '@/domain/medication';
import { MedicinesContent } from './medicines-content';

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

const activeMedicine: Medication = {
  id: 'd7bf17a4-3b0c-4c61-9155-7102fe0769f2',
  name: 'Morning capsule',
  instructions: 'With breakfast',
  supplyCount: 14,
  appearanceShape: 'capsule',
  appearanceSize: 'medium',
  appearanceTone: 'rose',
  appearanceSecondaryTone: 'lavender',
  createdAt: '2026-08-09T00:00:00.000Z',
  updatedAt: '2026-08-09T00:00:00.000Z',
  archivedAt: null,
  timeZoneIdentifier: 'Asia/Manila',
};

const baseProps = {
  isLoading: false,
  isError: false,
  onAdd: jest.fn(),
  onRetry: jest.fn(),
  onOpenMedicine: jest.fn(),
};

describe('MedicinesContent', () => {
  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  test('uses the organizer illustration and one clear action when empty', async () => {
    const onAdd = jest.fn();
    const screen = await render(<MedicinesContent {...baseProps} medicines={[]} onAdd={onAdd} />);

    expect(screen.getByText('Your medicines live here')).toBeOnTheScreen();
    expect(screen.getByText('Add the first one from the label in front of you.')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Add medicine'));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  test('separates archived medicines and keeps list metadata quiet', async () => {
    const onOpenMedicine = jest.fn();
    const archivedMedicine: Medication = {
      ...activeMedicine,
      id: '85a17e00-cd75-4e7d-a30b-e35974e1d9b4',
      name: 'Old tablet',
      archivedAt: '2026-08-10T00:00:00.000Z',
    };
    const screen = await render(
      <MedicinesContent
        {...baseProps}
        medicines={[activeMedicine, archivedMedicine]}
        onOpenMedicine={onOpenMedicine}
      />,
    );

    expect(screen.getByText('14 doses left')).toBeOnTheScreen();
    expect(screen.getAllByText('Archived')).toHaveLength(2);
    expect(screen.queryByText('With breakfast')).toBeNull();
    fireEvent.press(screen.getByLabelText('Open Morning capsule'));
    expect(onOpenMedicine).toHaveBeenCalledWith(activeMedicine.id);
  });

  test('offers retry without presenting the empty state when loading fails', async () => {
    const onRetry = jest.fn();
    const screen = await render(
      <MedicinesContent {...baseProps} medicines={undefined} isError onRetry={onRetry} />,
    );

    expect(screen.getByText('Couldn’t load medicines')).toBeOnTheScreen();
    expect(screen.queryByText('Your medicines live here')).toBeNull();
    fireEvent.press(screen.getByText('Try again'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
