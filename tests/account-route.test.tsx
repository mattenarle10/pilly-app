import type { PropsWithChildren } from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { AccountSessionContextValue } from '@/providers/account-session-provider';
import { useAccountSession } from '@/hooks/use-account-session';

import AccountRoute from '../src/app/account';

const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockCanGoBack = jest.fn();

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  router: {
    back: () => mockBack(),
    canGoBack: () => mockCanGoBack(),
    replace: (route: string) => mockReplace(route),
  },
}));
jest.mock('@/hooks/use-account-session', () => ({ useAccountSession: jest.fn() }));
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
const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function wrapper({ children }: PropsWithChildren) {
  return <SafeAreaProvider initialMetrics={initialMetrics}>{children}</SafeAreaProvider>;
}

function localAccount(
  overrides: Partial<AccountSessionContextValue> = {},
): AccountSessionContextValue {
  return {
    state: { kind: 'local', user: null },
    configured: true,
    busy: false,
    error: null,
    signIn: jest.fn(async () => true),
    signOut: jest.fn(async () => undefined),
    ...overrides,
  };
}

describe('account route', () => {
  afterEach(async () => {
    await cleanup();
    jest.clearAllMocks();
  });

  test('keeps account creation optional and starts Google sign-in', async () => {
    const account = localAccount();
    mockedUseAccountSession.mockReturnValue(account);
    const screen = await render(<AccountRoute />, { wrapper });

    expect(screen.getByText('Local by default.')).toBeOnTheScreen();
    expect(
      screen.getByText('Medicine tracking stays fully usable without an account or a connection.'),
    ).toBeOnTheScreen();

    fireEvent.press(screen.getByText('Continue with Google'));
    expect(account.signIn).toHaveBeenCalledTimes(1);
  });

  test('returns without changing local data', async () => {
    mockCanGoBack.mockReturnValue(true);
    mockedUseAccountSession.mockReturnValue(localAccount());
    const screen = await render(<AccountRoute />, { wrapper });

    fireEvent.press(screen.getByText('Keep using Pilly locally'));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  test('shows the connected identity and supports sign out', async () => {
    const account = localAccount({
      state: {
        kind: 'signed-in',
        user: { id: 'account-1', email: 'matt@example.com', displayName: 'Matthew' },
      },
    });
    mockedUseAccountSession.mockReturnValue(account);
    const screen = await render(<AccountRoute />, { wrapper });

    expect(screen.getByText('You’re connected.')).toBeOnTheScreen();
    expect(screen.getByText('matt@example.com')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Sign out'));
    expect(account.signOut).toHaveBeenCalledTimes(1);
  });
});
