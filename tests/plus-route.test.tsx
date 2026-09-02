import type { PropsWithChildren } from 'react';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import PlusRoute from '@/app/plus';
import { useAccountSession } from '@/hooks/use-account-session';
import { usePlus, type PlusState } from '@/hooks/use-plus';
import type { AccountSessionContextValue } from '@/providers/account-session-provider';
import type { PlusOffer } from '@/services/plus-offers';

const mockPush = jest.fn();
const mockSetParams = jest.fn();
let mockSearchParams: Record<string, string | undefined> = {};

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  router: {
    push: (route: unknown) => mockPush(route),
    setParams: (params: unknown) => mockSetParams(params),
  },
  useLocalSearchParams: () => mockSearchParams,
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
    deleteAccount: jest.fn(async () => true),
    ...overrides,
  };
}

function signedInAccount(): AccountSessionContextValue {
  return account({
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
    manage: mutation() as unknown as PlusHookValue['manage'],
    retry: jest.fn(),
    ...overrides,
  } as PlusHookValue;
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
  localizedPrice: '$2.99',
  localizedPricePerMonth: '$2.99',
  introductoryOffer: null,
};

function available(overrides: Partial<Omit<PlusHookValue, 'state'>> = {}): PlusHookValue {
  return plusState(
    {
      kind: 'available',
      active: false,
      canRestore: true,
      offers: { annual: annualOffer, monthly: monthlyOffer },
    },
    overrides,
  );
}

describe('Pilly Plus route', () => {
  beforeEach(() => {
    mockSearchParams = {};
  });

  afterEach(async () => {
    await cleanup();
    jest.clearAllMocks();
  });

  test('shows live pricing before account connection and preserves the selected plan', async () => {
    mockedUseAccountSession.mockReturnValue(account());
    mockedUsePlus.mockReturnValue(available());

    const screen = await render(<PlusRoute />, { wrapper });

    expect(screen.getByText('Your routine follows you.')).toBeOnTheScreen();
    expect(screen.getByText('$19.99')).toBeOnTheScreen();
    expect(screen.getByText('1 week free')).toBeOnTheScreen();
    expect(screen.queryByText(/connected/i)).toBeNull();
    expect(screen.queryByText('matt@example.com')).toBeNull();

    fireEvent.press(screen.getByLabelText(/Monthly, \$2\.99/));
    await waitFor(() => {
      expect(screen.getByLabelText(/Monthly, \$2\.99/).props.accessibilityState.checked).toBe(true);
    });
    fireEvent.press(screen.getByText('Continue'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/account',
      params: { returnTo: 'plus', plan: 'monthly' },
    });
  });

  test('keeps provider controls on Account when store plans are unavailable', async () => {
    mockedUseAccountSession.mockReturnValue(account());
    mockedUsePlus.mockReturnValue(plusState({ kind: 'preview', active: false, canRestore: false }));

    const screen = await render(<PlusRoute />, { wrapper });

    expect(screen.getByText('Preview')).toBeOnTheScreen();
    expect(screen.getByText('Connect account')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Continue with Apple')).toBeNull();
    expect(screen.queryByLabelText('Continue with Google')).toBeNull();
  });

  test('shows active access without exposing provider identity', async () => {
    mockedUseAccountSession.mockReturnValue(signedInAccount());
    mockedUsePlus.mockReturnValue(
      plusState({ kind: 'active', active: true, canRestore: true, offline: false }),
    );

    const screen = await render(<PlusRoute />, { wrapper });

    expect(screen.getByText('Pilly Plus is active.')).toBeOnTheScreen();
    expect(screen.getByText('Manage subscription')).toBeOnTheScreen();
    expect(screen.getByText('Manage account')).toBeOnTheScreen();
    expect(screen.queryByText('Apple connected')).toBeNull();
    expect(screen.queryByText('matt@example.com')).toBeNull();
    expect(screen.queryByText('Choose your plan')).toBeNull();
  });

  test('defaults to annual and purchases only after an explicit signed-in tap', async () => {
    mockedUseAccountSession.mockReturnValue(signedInAccount());
    const purchase = mutation();
    mockedUsePlus.mockReturnValue(
      available({ purchase: purchase as unknown as PlusHookValue['purchase'] }),
    );

    const screen = await render(<PlusRoute />, { wrapper });

    expect(screen.getByLabelText(/Annual, \$19\.99/).props.accessibilityState).toEqual({
      checked: true,
    });
    expect(screen.getByText('Start 1-week free trial')).toBeOnTheScreen();
    expect(screen.getByText('Then $19.99 per year. Auto-renews until canceled.')).toBeOnTheScreen();

    fireEvent.press(screen.getByLabelText(/Monthly, \$2\.99/));
    await waitFor(() => {
      expect(screen.getByLabelText(/Monthly, \$2\.99/).props.accessibilityState.checked).toBe(true);
    });
    fireEvent.press(screen.getByText('Subscribe'));

    expect(purchase.mutateAsync).toHaveBeenCalledWith('monthly');
  });

  test('restores directly for a connected account', async () => {
    mockedUseAccountSession.mockReturnValue(signedInAccount());
    const restore = mutation();
    mockedUsePlus.mockReturnValue(
      available({ restore: restore as unknown as PlusHookValue['restore'] }),
    );

    const screen = await render(<PlusRoute />, { wrapper });
    fireEvent.press(screen.getByText('Restore purchases'));

    expect(restore.mutateAsync).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Pilly’s free tracker stays free.')).toBeOnTheScreen();
  });

  test('resumes a user-requested restore after account connection', async () => {
    mockSearchParams = { plan: 'annual', intent: 'restore' };
    mockedUseAccountSession.mockReturnValue(signedInAccount());
    const restore = mutation();
    mockedUsePlus.mockReturnValue(
      available({ restore: restore as unknown as PlusHookValue['restore'] }),
    );

    await render(<PlusRoute />, { wrapper });

    await waitFor(() => expect(restore.mutateAsync).toHaveBeenCalledTimes(1));
    expect(mockSetParams).toHaveBeenCalledWith({ intent: undefined });
  });

  test('opens native subscription management for an active subscriber', async () => {
    mockedUseAccountSession.mockReturnValue(signedInAccount());
    const manage = mutation({ mutateAsync: jest.fn(async () => undefined) });
    mockedUsePlus.mockReturnValue(
      plusState(
        { kind: 'active', active: true, canRestore: true, offline: false },
        { manage: manage as unknown as PlusHookValue['manage'] },
      ),
    );

    const screen = await render(<PlusRoute />, { wrapper });
    fireEvent.press(screen.getByText('Manage subscription'));

    expect(manage.mutateAsync).toHaveBeenCalledTimes(1);
  });

  test('keeps access unchanged when purchase fails', async () => {
    mockedUseAccountSession.mockReturnValue(signedInAccount());
    const purchase = mutation({ isError: true });
    const restore = mutation();
    mockedUsePlus.mockReturnValue(
      available({
        purchase: purchase as unknown as PlusHookValue['purchase'],
        restore: restore as unknown as PlusHookValue['restore'],
      }),
    );

    const screen = await render(<PlusRoute />, { wrapper });

    expect(screen.getByText('Purchase not completed')).toBeOnTheScreen();
    expect(screen.getByText('Your current access is unchanged.')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Dismiss'));

    expect(purchase.reset).toHaveBeenCalledTimes(1);
    expect(restore.reset).toHaveBeenCalledTimes(1);
  });
});
