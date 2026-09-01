import type { PropsWithChildren } from 'react';
import { cleanup, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { AccountSessionContextValue } from '@/providers/account-session-provider';
import { useAccountSession } from '@/hooks/use-account-session';
import { useProfile } from '@/hooks/use-profile';
import { isPlusPurchasesSupported } from '@/services/purchases';

import ProfileRoute from '@/app/profile';

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  router: {
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
    push: jest.fn(),
    replace: jest.fn(),
  },
}));
jest.mock('@/hooks/use-account-session', () => ({ useAccountSession: jest.fn() }));
jest.mock('@/hooks/use-profile', () => ({ useProfile: jest.fn() }));
jest.mock('@/services/purchases', () => ({ isPlusPurchasesSupported: jest.fn() }));
jest.mock('@/ui/components/pilly-modal', () => ({ PillyModal: () => null }));
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

const mockedUseAccountSession = jest.mocked(useAccountSession);
const mockedUseProfile = jest.mocked(useProfile);
const mockedIsPlusPurchasesSupported = jest.mocked(isPlusPurchasesSupported);
const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function wrapper({ children }: PropsWithChildren) {
  return <SafeAreaProvider initialMetrics={initialMetrics}>{children}</SafeAreaProvider>;
}

function account(state: AccountSessionContextValue['state']): AccountSessionContextValue {
  return {
    state,
    configured: true,
    busy: false,
    signingInWith: null,
    error: null,
    signIn: jest.fn(async () => true),
    signOut: jest.fn(async () => undefined),
    deleteAccount: jest.fn(async () => true),
  };
}

describe('Profile route account boundary', () => {
  beforeEach(() => {
    mockedIsPlusPurchasesSupported.mockReturnValue(true);
    mockedUseProfile.mockReturnValue({
      isLoading: false,
      isError: false,
      name: { firstName: '', lastName: '' },
      displayName: '',
      archivedCount: 0,
      retry: jest.fn(),
      saveName: {
        isPending: false,
        isError: false,
        reset: jest.fn(),
        mutate: jest.fn(),
      },
    } as unknown as ReturnType<typeof useProfile>);
  });

  afterEach(async () => {
    await cleanup();
    jest.clearAllMocks();
  });

  test('keeps signed-out free users local and routes account setup through Plus', async () => {
    mockedUseAccountSession.mockReturnValue(account({ kind: 'local', user: null }));

    const screen = await render(<ProfileRoute />, { wrapper });

    expect(screen.getByText('Local profile')).toBeOnTheScreen();
    expect(screen.getByText('Pilly Plus')).toBeOnTheScreen();
    expect(screen.queryByText('Pilly Plus account')).toBeNull();
    expect(screen.queryByText('Account')).toBeNull();
  });

  test('shows provider-neutral account management only after connection', async () => {
    mockedUseAccountSession.mockReturnValue(
      account({
        kind: 'signed-in',
        user: {
          id: 'account-1',
          email: 'matt@example.com',
          displayName: 'Matthew',
          provider: 'google',
        },
      }),
    );

    const screen = await render(<ProfileRoute />, { wrapper });

    expect(screen.getByText('Account')).toBeOnTheScreen();
    expect(screen.getByText('Google · matt@example.com')).toBeOnTheScreen();
  });
});
