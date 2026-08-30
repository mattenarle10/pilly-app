import type { PropsWithChildren } from 'react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { PillyRepository } from '@/storage/repository';
import type { AccountSessionContextValue } from '@/providers/account-session-provider';
import {
  arePlusPurchasesEnabled,
  getPlusPreviewMode,
  isPlusPurchasesSupported,
  loadPlusStoreSnapshot,
  purchasePlus,
  restorePlus,
} from '@/services/purchases';

import { usePlus } from '@/hooks/use-plus';
import { useAccountSession } from '@/hooks/use-account-session';
import { useRepository } from '@/hooks/use-repository';

jest.mock('@/hooks/use-account-session', () => ({ useAccountSession: jest.fn() }));
jest.mock('@/hooks/use-repository');
jest.mock('@/services/purchases');

const mockedUseRepository = jest.mocked(useRepository);
const mockedUseAccountSession = jest.mocked(useAccountSession);
const mockedPreviewMode = jest.mocked(getPlusPreviewMode);
const mockedPurchasesEnabled = jest.mocked(arePlusPurchasesEnabled);
const mockedPurchasesSupported = jest.mocked(isPlusPurchasesSupported);
const mockedLoadSnapshot = jest.mocked(loadPlusStoreSnapshot);
const mockedPurchase = jest.mocked(purchasePlus);
const mockedRestore = jest.mocked(restorePlus);
const queryClients = new Set<QueryClient>();

function signedInAccount(): AccountSessionContextValue {
  return {
    state: {
      kind: 'signed-in',
      user: {
        id: 'cognito-sub-1',
        email: 'matt@example.com',
        displayName: 'Matthew',
        provider: 'apple',
      },
    },
    configured: true,
    busy: false,
    signingInWith: null,
    error: null,
    signIn: jest.fn(async () => true),
    signOut: jest.fn(async () => undefined),
  };
}

async function setup(cachedEntitlement: string | null = null) {
  const repository = {
    getSetting: jest.fn().mockResolvedValue(cachedEntitlement),
    setSetting: jest.fn().mockResolvedValue(undefined),
  };
  mockedUseRepository.mockReturnValue(repository as unknown as PillyRepository);
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
  queryClients.add(queryClient);
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return { repository, queryClient, ...(await renderHook(() => usePlus(), { wrapper })) };
}

describe('usePlus', () => {
  beforeEach(() => {
    mockedUseAccountSession.mockReturnValue(signedInAccount());
    mockedPreviewMode.mockReturnValue('store');
    mockedPurchasesEnabled.mockReturnValue(false);
    mockedPurchasesSupported.mockReturnValue(true);
    mockedLoadSnapshot.mockResolvedValue({ kind: 'unconfigured' });
  });

  afterEach(async () => {
    await cleanup();
    queryClients.forEach((queryClient) => queryClient.clear());
    queryClients.clear();
    jest.clearAllMocks();
  });

  test('keeps the paid preview local to development state', async () => {
    mockedPreviewMode.mockReturnValue('active');
    const { result } = await setup();

    expect(result.current.state).toEqual({ kind: 'preview', active: true, canRestore: false });
    expect(mockedLoadSnapshot).not.toHaveBeenCalled();
  });

  test('uses localized annual and monthly offers only when checkout is enabled', async () => {
    mockedPurchasesEnabled.mockReturnValue(true);
    mockedLoadSnapshot.mockResolvedValue({
      kind: 'ready',
      active: false,
      offers: {
        annual: {
          plan: 'annual',
          packageIdentifier: '$rc_annual',
          productIdentifier: 'pilly_plus_annual',
          localizedPrice: '₱1,499.00',
          localizedPricePerMonth: '₱124.92',
          introductoryOffer: null,
        },
        monthly: {
          plan: 'monthly',
          packageIdentifier: '$rc_monthly',
          productIdentifier: 'pilly_plus_monthly',
          localizedPrice: '₱149.00',
          localizedPricePerMonth: '₱149.00',
          introductoryOffer: null,
        },
      },
    });
    const { result } = await setup();

    await waitFor(() => expect(result.current.state.kind).toBe('available'));
    expect(result.current.state).toMatchObject({
      kind: 'available',
      offers: {
        annual: { localizedPrice: '₱1,499.00' },
        monthly: { localizedPrice: '₱149.00' },
      },
    });
  });

  test('keeps real subscription offers gated before device purchase QA', async () => {
    mockedLoadSnapshot.mockResolvedValue({
      kind: 'ready',
      active: false,
      offers: {
        annual: {
          plan: 'annual',
          packageIdentifier: '$rc_annual',
          productIdentifier: 'pilly_plus_annual',
          localizedPrice: '₱1,499.00',
          localizedPricePerMonth: '₱124.92',
          introductoryOffer: null,
        },
        monthly: null,
      },
    });
    const { result } = await setup();

    await waitFor(() => expect(result.current.state.kind).toBe('unavailable'));
    expect(result.current.state).toEqual({
      kind: 'unavailable',
      active: false,
      canRestore: true,
      reason: 'gate',
    });
  });

  test('keeps saved access when the store cannot refresh', async () => {
    mockedLoadSnapshot.mockRejectedValue(new Error('offline'));
    const { result } = await setup('true');

    await waitFor(() => expect(result.current.state.kind).toBe('active'));
    expect(result.current.state).toEqual({
      kind: 'active',
      active: true,
      canRestore: true,
      offline: true,
    });
  });

  test('keeps cached Plus unlocked while the store refreshes', async () => {
    mockedLoadSnapshot.mockReturnValue(new Promise(() => undefined));
    const { result } = await setup('true');

    await waitFor(() => expect(result.current.state.kind).toBe('active'));
    expect(result.current.state).toEqual({
      kind: 'active',
      active: true,
      canRestore: false,
      offline: true,
    });
  });

  test('keeps saved access when store configuration is unavailable', async () => {
    mockedLoadSnapshot.mockResolvedValue({ kind: 'unconfigured' });
    const { result } = await setup('true');

    await waitFor(() => expect(result.current.state.kind).toBe('active'));
    expect(result.current.state).toEqual({
      kind: 'active',
      active: true,
      canRestore: false,
      offline: true,
    });
  });

  test('does not grant cached iOS access on an unsupported platform', async () => {
    mockedPurchasesSupported.mockReturnValue(false);
    mockedLoadSnapshot.mockResolvedValue({ kind: 'unconfigured' });
    const { result } = await setup('true');

    await waitFor(() => expect(result.current.state.kind).toBe('unavailable'));
    expect(result.current.state.active).toBe(false);
  });

  test('does not load or inherit paid access without a connected account', async () => {
    mockedUseAccountSession.mockReturnValue({
      ...signedInAccount(),
      state: { kind: 'local', user: null },
    });
    const { repository, result } = await setup('true');

    expect(result.current.state).toEqual({
      kind: 'unavailable',
      active: false,
      canRestore: false,
      reason: 'store',
    });
    expect(mockedLoadSnapshot).not.toHaveBeenCalled();
    expect(repository.getSetting).not.toHaveBeenCalled();
    await result.current.retry();
    expect(mockedLoadSnapshot).not.toHaveBeenCalled();
    expect(repository.getSetting).not.toHaveBeenCalled();
  });

  test('does not turn a cancelled checkout into an error or entitlement', async () => {
    mockedPurchasesEnabled.mockReturnValue(true);
    mockedLoadSnapshot.mockResolvedValue({
      kind: 'ready',
      active: false,
      offers: {
        annual: {
          plan: 'annual',
          packageIdentifier: '$rc_annual',
          productIdentifier: 'pilly_plus_annual',
          localizedPrice: '$49.99',
          localizedPricePerMonth: '$4.17',
          introductoryOffer: null,
        },
        monthly: null,
      },
    });
    mockedPurchase.mockResolvedValue({ kind: 'cancelled' });
    const { repository, result } = await setup();

    await waitFor(() => expect(result.current.state.kind).toBe('available'));
    repository.setSetting.mockClear();
    let outcome;
    await act(async () => {
      outcome = await result.current.purchase.mutateAsync('annual');
    });

    expect(outcome).toEqual({ kind: 'cancelled' });
    expect(mockedPurchase).toHaveBeenCalledWith('cognito-sub-1', 'annual');
    expect(repository.setSetting).not.toHaveBeenCalled();
    expect(mockedRestore).not.toHaveBeenCalled();
  });

  test('keeps a failed restore retryable without changing cached access', async () => {
    mockedLoadSnapshot.mockResolvedValue({
      kind: 'ready',
      active: false,
      offers: { annual: null, monthly: null },
    });
    mockedRestore.mockRejectedValue(new Error('restore unavailable'));
    const { repository, result } = await setup();

    await waitFor(() => expect(result.current.state.kind).toBe('unavailable'));
    repository.setSetting.mockClear();

    await expect(result.current.restore.mutateAsync()).rejects.toThrow('restore unavailable');
    expect(repository.setSetting).not.toHaveBeenCalled();
  });
});
