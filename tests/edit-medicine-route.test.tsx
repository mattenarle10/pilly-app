import type { PropsWithChildren } from 'react';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react-native';

import EditMedicineRoute from '@/app/medicine/[id]/edit';
import { useEditMedicine } from '@/hooks/use-edit-medicine';
import { useMedicinePhoto } from '@/hooks/use-medicine-photo';
import { buildMedication, buildSchedule } from './support/builders';

const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  router: { back: () => mockBack() },
  useLocalSearchParams: () => ({ id: 'medicine-1' }),
  useNavigation: () => ({ dispatch: jest.fn() }),
}));
jest.mock('expo-router/react-navigation', () => ({ usePreventRemove: jest.fn() }));
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
jest.mock('@/hooks/use-edit-medicine', () => ({ useEditMedicine: jest.fn() }));
jest.mock('@/hooks/use-medicine-photo', () => ({ useMedicinePhoto: jest.fn() }));
jest.mock('@/ui/components/medicine-form-shell', () => {
  const { Pressable } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    MedicineFormShell: ({
      actionLabel,
      actionDisabled,
      onAction,
      children,
    }: PropsWithChildren<{
      actionLabel: string;
      actionDisabled: boolean;
      onAction: () => void;
    }>) => (
      <>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          accessibilityState={{ disabled: actionDisabled }}
          disabled={actionDisabled}
          onPress={onAction}
        />
        {children}
      </>
    ),
  };
});
jest.mock('@/ui/components/medicine-appearance-field', () => ({
  MedicineTypeStep: () => null,
}));
jest.mock('@/ui/components/medicine-photo-field', () => ({ MedicinePhotoField: () => null }));
jest.mock('@/ui/components/medicine-form-sections', () => ({
  DetailsStep: () => null,
  NameStep: () => null,
  ScheduleStep: () => null,
}));
jest.mock('@/ui/components/pilly-confirmation-sheet', () => ({
  PillyConfirmationSheet: () => null,
}));

const mockedUseEditMedicine = jest.mocked(useEditMedicine);
const mockedUseMedicinePhoto = jest.mocked(useMedicinePhoto);

describe('edit medicine route', () => {
  afterEach(async () => {
    await cleanup();
    jest.clearAllMocks();
  });

  test('enables Done for a photo-only local edit', async () => {
    mockedUseEditMedicine.mockReturnValue({
      query: {
        isLoading: false,
        isError: false,
        data: {
          medication: buildMedication({ id: 'd7bf17a4-3b0c-4c61-9155-7102fe0769f2' }),
          schedules: [buildSchedule()],
        },
      },
      saveMutation: {
        isPending: false,
        isError: false,
        reset: jest.fn(),
        mutate: jest.fn(),
      },
    } as unknown as ReturnType<typeof useEditMedicine>);
    mockedUseMedicinePhoto.mockReturnValue({
      available: true,
      hasChanges: true,
      uri: 'file:///private/photo.jpg',
      isBusy: false,
      error: null,
      errorKind: null,
      select: jest.fn(),
      remove: jest.fn(),
      retry: jest.fn(),
    } as unknown as ReturnType<typeof useMedicinePhoto>);

    const screen = await render(<EditMedicineRoute />);
    const done = screen.getByLabelText('Done');
    expect(done.props.accessibilityState.disabled).toBe(false);
    fireEvent.press(done);

    await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
  });
});
