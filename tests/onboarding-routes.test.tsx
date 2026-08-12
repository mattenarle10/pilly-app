import type { PropsWithChildren } from 'react';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { PillyRepository } from '@/storage/repository';
import { useRepository } from '@/hooks/use-repository';

import WelcomeRoute from '../app/(onboarding)/welcome';
import OnboardingNameRoute from '../app/(onboarding)/name';
import StartSmallRoute from '../app/(onboarding)/start-small';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockUseProfileName = jest.fn();
let mockSaveName: {
  isIdle: boolean;
  isPending: boolean;
  isError: boolean;
  reset: jest.Mock;
  mutate: jest.Mock;
};

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: mockBack }),
}));

jest.mock('@/hooks/use-repository');
jest.mock('@/hooks', () => ({ useProfileName: () => mockUseProfileName() }));

jest.mock('@/ui/illustrations', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    OnboardingJourney: ({ stage }: { stage: string }) =>
      React.createElement(View, { testID: `onboarding-${stage}` }),
  };
});

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

const mockedUseRepository = jest.mocked(useRepository);
const queryClients = new Set<QueryClient>();
const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function SafeAreaTestProvider({ children }: PropsWithChildren) {
  return <SafeAreaProvider initialMetrics={initialMetrics}>{children}</SafeAreaProvider>;
}

function wrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
  queryClients.add(queryClient);

  return function TestProviders({ children }: PropsWithChildren) {
    return (
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </SafeAreaProvider>
    );
  };
}

describe('onboarding routes', () => {
  beforeEach(() => {
    mockSaveName = {
      isIdle: true,
      isPending: false,
      isError: false,
      reset: jest.fn(),
      mutate: jest.fn((_draft: unknown, options?: { onSuccess?: () => void }) =>
        options?.onSuccess?.(),
      ),
    };
    mockUseProfileName.mockReturnValue({
      displayName: '',
      isLoading: false,
      isError: false,
      retry: jest.fn(),
      saveName: mockSaveName,
    });
  });

  afterEach(async () => {
    await cleanup();
    queryClients.forEach((queryClient) => queryClient.clear());
    queryClients.clear();
    jest.clearAllMocks();
  });

  test('continues from Welcome to the optional name step', async () => {
    const screen = await render(<WelcomeRoute />, { wrapper: SafeAreaTestProvider });

    expect(screen.getByTestId('onboarding-welcome')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Continue'));

    expect(mockPush).toHaveBeenCalledWith('/(onboarding)/name');
  });

  test('offers Pilly Plus as an optional branch from Welcome', async () => {
    const screen = await render(<WelcomeRoute />, { wrapper: SafeAreaTestProvider });

    fireEvent.press(screen.getByText('See Pilly Plus'));

    expect(mockPush).toHaveBeenCalledWith('/plus');
  });

  test('saves a first name before continuing to Start Small', async () => {
    const screen = await render(<OnboardingNameRoute />, { wrapper: wrapper() });

    await act(async () => {
      fireEvent.changeText(await screen.findByLabelText('First name'), '  Ada  ');
    });
    fireEvent.press(screen.getByText('Continue'));

    expect(mockSaveName.mutate).toHaveBeenCalledWith(
      { firstName: '  Ada  ', lastName: '' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
    expect(mockReplace).toHaveBeenCalledWith('/(onboarding)/start-small');
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  test('can skip the optional name and continue with an empty profile', async () => {
    const screen = await render(<OnboardingNameRoute />, { wrapper: wrapper() });

    fireEvent.press(await screen.findByText('Skip for now'));

    expect(mockReplace).toHaveBeenCalledWith('/(onboarding)/start-small');
  });

  test('does not ask for a name that already exists', async () => {
    mockUseProfileName.mockReturnValue({
      displayName: 'Ada',
      isLoading: false,
      isError: false,
      retry: jest.fn(),
      saveName: mockSaveName,
    });
    await render(<OnboardingNameRoute />, { wrapper: wrapper() });

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(onboarding)/start-small'));
  });

  test('does not run the existing-name redirect while a save is active', async () => {
    mockUseProfileName.mockReturnValue({
      displayName: 'Ada',
      isLoading: false,
      isError: false,
      retry: jest.fn(),
      saveName: { ...mockSaveName, isIdle: false, isPending: true },
    });
    await render(<OnboardingNameRoute />, { wrapper: wrapper() });

    expect(mockReplace).not.toHaveBeenCalled();
  });

  test('persists onboarding before opening the first medicine form', async () => {
    const setSetting = jest.fn().mockResolvedValue(undefined);
    mockedUseRepository.mockReturnValue({ setSetting } as unknown as PillyRepository);
    const screen = await render(<StartSmallRoute />, { wrapper: wrapper() });

    await act(async () => {
      fireEvent.press(screen.getByText('Add first medicine'));
    });

    await waitFor(() => expect(setSetting).toHaveBeenCalledWith('hasCompletedOnboarding', 'true'));
    expect(mockReplace).toHaveBeenCalledWith('/medicine/new');
  });

  test('can finish without adding a medicine', async () => {
    const setSetting = jest.fn().mockResolvedValue(undefined);
    mockedUseRepository.mockReturnValue({ setSetting } as unknown as PillyRepository);
    const screen = await render(<StartSmallRoute />, { wrapper: wrapper() });

    await act(async () => {
      fireEvent.press(screen.getByText('Not now'));
    });

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(tabs)/today'));
  });

  test('shows a retryable local error without navigating', async () => {
    const setSetting = jest.fn().mockRejectedValue(new Error('Write failed'));
    mockedUseRepository.mockReturnValue({ setSetting } as unknown as PillyRepository);
    const screen = await render(<StartSmallRoute />, { wrapper: wrapper() });

    await act(async () => {
      fireEvent.press(screen.getByText('Add first medicine'));
    });

    expect(await screen.findByText('Couldn’t finish setup. Try again.')).toBeOnTheScreen();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
