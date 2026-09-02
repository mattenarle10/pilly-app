import { act, cleanup, fireEvent, render } from '@testing-library/react-native';

import type { Medication } from '@/models/medication';
import { MedicinesContent } from '@/ui/components/medicines-content';

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
  appearanceColor: '#F3CCD7',
  appearanceSecondaryColor: '#ECEAF7',
  createdAt: '2026-08-09T00:00:00.000Z',
  updatedAt: '2026-08-09T00:00:00.000Z',
  archivedAt: null,
  timeZoneIdentifier: 'Asia/Manila',
};

const archivedMedicine: Medication = {
  ...activeMedicine,
  id: '85a17e00-cd75-4e7d-a30b-e35974e1d9b4',
  name: 'Old tablet',
  archivedAt: '2026-08-10T00:00:00.000Z',
};

const baseProps = {
  view: 'cabinet' as const,
  sort: 'name' as const,
  isLoading: false,
  isError: false,
  onAdd: jest.fn(),
  onRetry: jest.fn(),
  onViewChange: jest.fn(),
  onSortChange: jest.fn(),
  onOpenMedicine: jest.fn(),
  onOpenArchived: jest.fn(),
};

describe('MedicinesContent', () => {
  afterEach(async () => {
    await cleanup();
    jest.clearAllMocks();
  });

  test('uses the organizer illustration and one clear action when empty', async () => {
    const onAdd = jest.fn();
    const screen = await render(<MedicinesContent {...baseProps} medicines={[]} onAdd={onAdd} />);

    expect(screen.getByText('Your medicines live here')).toBeOnTheScreen();
    expect(screen.getByText('Add the first one from the label in front of you.')).toBeOnTheScreen();
    await act(async () => fireEvent.press(screen.getByText('Add medicine')));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  test('renders a cabinet, keeps metadata quiet, and separates the archived shelf', async () => {
    const onOpenMedicine = jest.fn();
    const onOpenArchived = jest.fn();
    const screen = await render(
      <MedicinesContent
        {...baseProps}
        medicines={[activeMedicine, archivedMedicine]}
        onOpenMedicine={onOpenMedicine}
        onOpenArchived={onOpenArchived}
      />,
    );

    expect(screen.getByText('Morning capsule')).toBeOnTheScreen();
    expect(screen.queryByText('14 doses left')).toBeNull();
    expect(screen.queryByText('With breakfast')).toBeNull();
    await act(async () =>
      fireEvent.press(
        screen.getByLabelText(
          'Morning capsule. Medicine. Rose capsule medicine. Opens medicine details.',
        ),
      ),
    );
    expect(onOpenMedicine).toHaveBeenCalledWith(activeMedicine.id);
    await act(async () =>
      fireEvent.press(screen.getByLabelText('Open archived medicines, 1 medicine')),
    );
    expect(onOpenArchived).toHaveBeenCalledTimes(1);
  });

  test('uses active Plus photos and falls back to collection controls', async () => {
    const onViewChange = jest.fn();
    const onSortChange = jest.fn();
    const screen = await render(
      <MedicinesContent
        {...baseProps}
        medicines={[activeMedicine]}
        photoUris={{ [activeMedicine.id]: 'file:///medicine.jpg' }}
        onViewChange={onViewChange}
        onSortChange={onSortChange}
      />,
    );

    expect(screen.getByTestId(`medicine-photo-${activeMedicine.id}`)).toBeOnTheScreen();
    await act(async () => fireEvent.press(screen.getByLabelText('Show medicines as list')));
    expect(onViewChange).toHaveBeenCalledWith('list');
    await act(async () =>
      fireEvent.press(screen.getByLabelText('Sort medicines by recently added')),
    );
    expect(onSortChange).toHaveBeenCalledWith('recent');
  });

  test('shows archived medicines in their quieter dedicated collection', async () => {
    const screen = await render(
      <MedicinesContent {...baseProps} archived medicines={[activeMedicine, archivedMedicine]} />,
    );

    expect(screen.getByText('Old tablet')).toBeOnTheScreen();
    expect(screen.getByText('Archived')).toBeOnTheScreen();
    expect(screen.queryByText('Morning capsule')).toBeNull();
  });

  test('offers retry without presenting the empty state when loading fails', async () => {
    const onRetry = jest.fn();
    const screen = await render(
      <MedicinesContent {...baseProps} medicines={undefined} isError onRetry={onRetry} />,
    );

    expect(screen.getByText('Couldn’t load medicines')).toBeOnTheScreen();
    expect(screen.queryByText('Your medicines live here')).toBeNull();
    await act(async () => fireEvent.press(screen.getByText('Try again')));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
