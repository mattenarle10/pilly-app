import type { PropsWithChildren } from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { AccountSessionContextValue } from '@/providers/account-session-provider';
import { useAccountSession } from '@/hooks/use-account-session';
import { useCloudSync } from '@/hooks/use-cloud-sync';

import AccountRoute from '@/app/account';

const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockCanGoBack = jest.fn();
let mockSearchParams: Record<string, string | undefined> = {};

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  router: {
    back: () => mockBack(),
    canGoBack: () => mockCanGoBack(),
    replace: (route: unknown) => mockReplace(route),
  },
  useLocalSearchParams: () => mockSearchParams,
}));
jest.mock('@/hooks/use-account-session', () => ({ useAccountSession: jest.fn() }));
jest.mock('@/hooks/use-cloud-sync', () => ({ useCloudSync: jest.fn() }));
jest.mock('@/ui/components/apple-sign-in-button', () => {
  const { Pressable } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    AppleSignInButton: ({ onPress }: { onPress: () => void }) => (
      <Pressable accessibilityLabel="Continue with Apple" onPress={onPress} />
    ),
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

const mockedUseAccountSession = jest.mocked(useAccountSession);
const mockedUseCloudSync = jest.mocked(useCloudSync);
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
    signingInWith: null,
    error: null,
    signIn: jest.fn(async () => true),
    signOut: jest.fn(async () => undefined),
    deleteAccount: jest.fn(async () => true),
    ...overrides,
  };
}

describe('account route', () => {
  beforeEach(() => {
    mockSearchParams = {};
    mockedUseCloudSync.mockReturnValue({
      configured: true,
      status: { kind: 'local' },
      chooseSetup: jest.fn(),
      retry: jest.fn(),
    });
  });
  afterEach(async () => {
    await cleanup();
    jest.clearAllMocks();
  });

  test('keeps equivalent Apple and Google sign-in inside the optional Plus path', async () => {
    const account = localAccount();
    mockedUseAccountSession.mockReturnValue(account);
    const screen = await render(<AccountRoute />, { wrapper });

    expect(screen.getByText('Connect Pilly Plus')).toBeOnTheScreen();
    expect(screen.getByText('Choose Apple or Google.')).toBeOnTheScreen();
    expect(screen.getByText('Medicine data stays local.')).toBeOnTheScreen();

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Continue with Apple'));
    });
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Continue with Google'));
    });
    expect(account.signIn).toHaveBeenNthCalledWith(1, 'apple');
    expect(account.signIn).toHaveBeenNthCalledWith(2, 'google');
  });

  test('returns without changing local data', async () => {
    mockCanGoBack.mockReturnValue(true);
    mockedUseAccountSession.mockReturnValue(localAccount());
    const screen = await render(<AccountRoute />, { wrapper });

    fireEvent.press(screen.getByText('Not now'));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  test('returns to Plus with the selected plan after successful connection', async () => {
    mockSearchParams = { returnTo: 'plus', plan: 'monthly' };
    const account = localAccount();
    mockedUseAccountSession.mockReturnValue(account);
    const screen = await render(<AccountRoute />, { wrapper });

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Continue with Apple'));
    });

    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/plus',
      params: { plan: 'monthly' },
    });
  });

  test('shows the connected identity and supports sign out', async () => {
    const account = localAccount({
      state: {
        kind: 'signed-in',
        user: {
          id: 'account-1',
          email: 'matt@example.com',
          displayName: 'Matthew',
          provider: 'apple',
        },
      },
    });
    mockedUseAccountSession.mockReturnValue(account);
    const screen = await render(<AccountRoute />, { wrapper });

    expect(screen.getByText('Your account')).toBeOnTheScreen();
    expect(screen.getByText('Apple connected')).toBeOnTheScreen();
    expect(screen.getByText('matt@example.com')).toBeOnTheScreen();
    expect(screen.getByLabelText('Apple connected, matt@example.com')).toBeOnTheScreen();
    expect(screen.getByText('account-1')).toBeOnTheScreen();
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    fireEvent.press(screen.getByText('Sign out'));
    expect(alert).toHaveBeenCalledWith(
      'Sign out of Pilly Plus?',
      expect.stringMatching(/removed from this iPhone.*subscription stay active/),
      expect.any(Array),
    );
    const signOutAction = alert.mock.calls[0]?.[2]?.find((action) => action.text === 'Sign out');
    signOutAction?.onPress?.();
    expect(account.signOut).toHaveBeenCalledTimes(1);
  });

  test('deletes only after explaining the local-data and subscription boundaries', async () => {
    const account = localAccount({
      state: {
        kind: 'signed-in',
        user: {
          id: 'account-1',
          email: 'matt@example.com',
          displayName: 'Matthew',
          provider: 'apple',
        },
      },
    });
    mockedUseAccountSession.mockReturnValue(account);
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const screen = await render(<AccountRoute />, { wrapper });

    fireEvent.press(screen.getByText('Delete Pilly Plus account'));
    expect(alert).toHaveBeenCalledWith(
      'Delete Pilly Plus account?',
      expect.stringMatching(/Medicines stay on this iPhone.*subscription is managed separately/),
      expect.any(Array),
    );

    expect(alert.mock.calls[0]?.[2]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
        expect.objectContaining({ text: 'Delete account', style: 'destructive' }),
      ]),
    );
  });

  test('requires an explicit first backup for existing local data', async () => {
    const chooseSetup = jest.fn().mockResolvedValue(undefined);
    mockedUseCloudSync.mockReturnValue({
      configured: true,
      status: { kind: 'pending-backup' },
      chooseSetup,
      retry: jest.fn(),
    });
    mockedUseAccountSession.mockReturnValue(
      localAccount({
        state: {
          kind: 'signed-in',
          user: {
            id: 'account-1',
            email: 'matt@example.com',
            displayName: 'Matthew',
            provider: 'apple',
          },
        },
      }),
    );
    const screen = await render(<AccountRoute />, { wrapper });

    fireEvent.press(screen.getByText('Back up this iPhone'));
    expect(chooseSetup).toHaveBeenCalledWith('backup');
  });
});
