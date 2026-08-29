import type { PropsWithChildren } from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { AccountSessionContextValue } from '@/providers/account-session-provider';
import { useAccountSession } from '@/hooks/use-account-session';
import { usePlus } from '@/hooks/use-plus';

import PlusRoute from '../src/app/plus';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  router: { push: (route: string) => mockPush(route) },
}));
jest.mock('@/hooks/use-account-session', () => ({ useAccountSession: jest.fn() }));
jest.mock('@/hooks/use-plus', () => ({ usePlus: jest.fn() }));
jest.mock('@/ui/illustrations', () => ({ PillyPlusCompanion: () => null }));
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
const mockedUsePlus = jest.mocked(usePlus);
const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function wrapper({ children }: PropsWithChildren) {
  return <SafeAreaProvider initialMetrics={initialMetrics}>{children}</SafeAreaProvider>;
}

function account(overrides: Partial<AccountSessionContextValue> = {}): AccountSessionContextValue {
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

function plus(active: boolean) {
  return {
    state: { kind: 'preview' as const, active, canRestore: false as const },
    purchase: {} as ReturnType<typeof usePlus>['purchase'],
    restore: {} as ReturnType<typeof usePlus>['restore'],
    retry: jest.fn(),
  };
}

describe('Pilly Plus route', () => {
  afterEach(async () => {
    await cleanup();
    jest.clearAllMocks();
  });

  test('owns Google sign-in while keeping checkout off', async () => {
    const localAccount = account();
    mockedUseAccountSession.mockReturnValue(localAccount);
    mockedUsePlus.mockReturnValue(plus(false));

    const screen = await render(<PlusRoute />, { wrapper });

    expect(screen.getByText('Private cloud backup')).toBeOnTheScreen();
    expect(screen.getByText('Medicine photos')).toBeOnTheScreen();
    expect(screen.getByText('Free preview · checkout off')).toBeOnTheScreen();
    expect(screen.queryByText(/lifetime/i)).toBeNull();
    fireEvent.press(screen.getByLabelText('Sign in with Google'));
    expect(localAccount.signIn).toHaveBeenCalledTimes(1);
  });

  test('requires a connected account before showing active Plus access', async () => {
    mockedUseAccountSession.mockReturnValue(account());
    mockedUsePlus.mockReturnValue(plus(true));

    const screen = await render(<PlusRoute />, { wrapper });

    expect(screen.getByText('Free preview · checkout off')).toBeOnTheScreen();
    expect(screen.getByLabelText('Sign in with Google')).toBeOnTheScreen();
    expect(screen.queryByText('Pilly Plus preview is active')).toBeNull();
  });

  test('shows simulated access after the Plus account is connected', async () => {
    mockedUseAccountSession.mockReturnValue(
      account({
        state: {
          kind: 'signed-in',
          user: { id: 'account-1', email: 'matt@example.com', displayName: 'Matthew' },
        },
      }),
    );
    mockedUsePlus.mockReturnValue(plus(true));

    const screen = await render(<PlusRoute />, { wrapper });

    expect(screen.getByText('Pilly Plus preview is active')).toBeOnTheScreen();
    expect(screen.getByText('matt@example.com')).toBeOnTheScreen();
    expect(
      screen.getByText('No purchase was made. Cloud sync remains off in this local preview.'),
    ).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Manage Pilly Plus account'));
    expect(mockPush).toHaveBeenCalledWith('/account');
  });
});
