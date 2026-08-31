import type { PropsWithChildren } from 'react';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { AccountSessionContextValue } from '@/providers/account-session-provider';
import { useAccountSession } from '@/hooks/use-account-session';
import { usePlus, type PlusState } from '@/hooks/use-plus';
import type { PlusOffer } from '@/services/plus-offers';

import PlusRoute from '@/app/plus';

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
    signingInWith: null,
    error: null,
    signIn: jest.fn(async () => true),
    signOut: jest.fn(async () => undefined),
    ...overrides,
  };
}

type PlusHookValue = ReturnType<typeof usePlus>;

function mutation(overrides: Record<string, unknown> = {}) {
  return {
    mutateAsync: jest.fn(async () => ({ kind: 'active' as const })),
    isPending: false,
    isError: false,
    reset: jest.fn(),
    ...overrides,
  };
}

function plusState(
  state: PlusState,
  overrides: Partial<Omit<PlusHookValue, 'state'>> = {},
): PlusHookValue {
  return {
    state,
    purchase: mutation() as unknown as PlusHookValue['purchase'],
    restore: mutation() as unknown as PlusHookValue['restore'],
    retry: jest.fn(),
    ...overrides,
  } as PlusHookValue;
}

function plus(active: boolean): PlusHookValue {
  return plusState({ kind: 'preview', active, canRestore: false });
}

const annualOffer: PlusOffer = {
  plan: 'annual',
  packageIdentifier: '$rc_annual',
  productIdentifier: 'dev.sidequests.pilly.plus.annual',
  localizedPrice: '$19.99',
  localizedPricePerMonth: '$1.66',
  introductoryOffer: {
    price: 0,
    localizedPrice: '$0.00',
    period: 'P1W',
    cycles: 1,
  },
};

const monthlyOffer: PlusOffer = {
  plan: 'monthly',
  packageIdentifier: '$rc_monthly',
  productIdentifier: 'dev.sidequests.pilly.plus.monthly',
  localizedPrice: '$4.99',
  localizedPricePerMonth: '$4.99',
  introductoryOffer: null,
};

describe('Pilly Plus route', () => {
  afterEach(async () => {
    await cleanup();
    jest.clearAllMocks();
  });

  test('explains Plus and sends local users to the account route', async () => {
    const localAccount = account();
    mockedUseAccountSession.mockReturnValue(localAccount);
    mockedUsePlus.mockReturnValue(plus(false));

    const screen = await render(<PlusRoute />, { wrapper });

    expect(screen.getByText('Private backup')).toBeOnTheScreen();
    expect(screen.getByText('Medicine photos')).toBeOnTheScreen();
    expect(screen.getByText('Preview')).toBeOnTheScreen();
    expect(screen.getByText('Connect account')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Continue with Apple')).toBeNull();
    expect(screen.queryByLabelText('Continue with Google')).toBeNull();
    expect(screen.queryByText(/lifetime/i)).toBeNull();
    fireEvent.press(screen.getByText('Connect account'));
    expect(mockPush).toHaveBeenCalledWith('/account');
    expect(localAccount.signIn).not.toHaveBeenCalled();
  });

  test('requires a connected account before showing active Plus access', async () => {
    mockedUseAccountSession.mockReturnValue(account());
    mockedUsePlus.mockReturnValue(plus(true));

    const screen = await render(<PlusRoute />, { wrapper });

    expect(screen.getByText('Preview')).toBeOnTheScreen();
    expect(screen.getByText('Connect account')).toBeOnTheScreen();
    expect(screen.queryByText('Pilly Plus preview is active')).toBeNull();
  });

  test('shows simulated access after the Plus account is connected', async () => {
    mockedUseAccountSession.mockReturnValue(
      account({
        state: {
          kind: 'signed-in',
          user: {
            id: 'account-1',
            email: 'matt@example.com',
            displayName: 'Matthew',
            provider: 'google',
          },
        },
      }),
    );
    mockedUsePlus.mockReturnValue(plus(true));

    const screen = await render(<PlusRoute />, { wrapper });

    expect(screen.getByText('Pilly Plus preview is active')).toBeOnTheScreen();
    expect(screen.getByText('matt@example.com')).toBeOnTheScreen();
    expect(screen.getByText('Preview')).toBeOnTheScreen();
    expect(screen.getByText('Preview access only. Cloud backup remains off.')).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText('Pilly Plus preview is active, matt@example.com'));
    expect(mockPush).toHaveBeenCalledWith('/account');
  });

  test('defaults to the annual offer and purchases the selected live plan', async () => {
    mockedUseAccountSession.mockReturnValue(
      account({
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
    const purchase = mutation();
    mockedUsePlus.mockReturnValue(
      plusState(
        {
          kind: 'available',
          active: false,
          canRestore: true,
          offers: { annual: annualOffer, monthly: monthlyOffer },
        },
        { purchase: purchase as unknown as PlusHookValue['purchase'] },
      ),
    );

    const screen = await render(<PlusRoute />, { wrapper });

    expect(screen.getByText('1 week free')).toBeOnTheScreen();
    expect(screen.getByText('$19.99')).toBeOnTheScreen();
    expect(screen.getByText('$1.66 per month')).toBeOnTheScreen();
    expect(screen.getByLabelText('Annual, $19.99').props.accessibilityState).toEqual({
      checked: true,
    });

    fireEvent.press(screen.getByLabelText('Monthly, $4.99'));
    await waitFor(() => {
      expect(screen.getByLabelText('Monthly, $4.99').props.accessibilityState.checked).toBe(true);
    });
    fireEvent.press(screen.getByText('Continue with Monthly'));

    expect(purchase.mutateAsync).toHaveBeenCalledWith('monthly');
  });

  test('restores purchases without changing free local tracking', async () => {
    mockedUseAccountSession.mockReturnValue(
      account({
        state: {
          kind: 'signed-in',
          user: {
            id: 'account-1',
            email: 'matt@example.com',
            displayName: 'Matthew',
            provider: 'google',
          },
        },
      }),
    );
    const restore = mutation();
    mockedUsePlus.mockReturnValue(
      plusState(
        {
          kind: 'available',
          active: false,
          canRestore: true,
          offers: { annual: annualOffer, monthly: monthlyOffer },
        },
        { restore: restore as unknown as PlusHookValue['restore'] },
      ),
    );

    const screen = await render(<PlusRoute />, { wrapper });
    fireEvent.press(screen.getByText('Restore purchases'));

    expect(restore.mutateAsync).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Core tracking stays free')).toBeOnTheScreen();
  });

  test('keeps access unchanged and dismisses a recoverable purchase error', async () => {
    mockedUseAccountSession.mockReturnValue(
      account({
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
    const purchase = mutation({ isError: true });
    const restore = mutation();
    mockedUsePlus.mockReturnValue(
      plusState(
        {
          kind: 'available',
          active: false,
          canRestore: true,
          offers: { annual: annualOffer, monthly: monthlyOffer },
        },
        {
          purchase: purchase as unknown as PlusHookValue['purchase'],
          restore: restore as unknown as PlusHookValue['restore'],
        },
      ),
    );

    const screen = await render(<PlusRoute />, { wrapper });

    expect(screen.getByText('Purchase not completed')).toBeOnTheScreen();
    expect(
      screen.getByText('Your current access is unchanged. Please try again.'),
    ).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Dismiss'));

    expect(purchase.reset).toHaveBeenCalledTimes(1);
    expect(restore.reset).toHaveBeenCalledTimes(1);
  });
});
