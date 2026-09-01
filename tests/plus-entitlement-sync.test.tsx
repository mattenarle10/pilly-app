import type { PropsWithChildren } from 'react';
import { cleanup, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { PillyRepository } from '@/storage/repository';
import type { AccountSessionContextValue } from '@/providers/account-session-provider';
import { queryKeys } from '@/hooks/query-keys';
import { plusEntitlementSettingKey } from '@/hooks/use-plus';
import { useAccountSession } from '@/hooks/use-account-session';
import { useRepository } from '@/hooks/use-repository';
import { disconnectPlusPurchasesIdentity, subscribeToPlusEntitlement } from '@/services/purchases';

import { PlusEntitlementSync } from '@/providers/plus-entitlement-sync';

jest.mock('@/hooks/use-account-session', () => ({ useAccountSession: jest.fn() }));
jest.mock('@/hooks/use-repository');
jest.mock('@/services/purchases');

const mockedUseRepository = jest.mocked(useRepository);
const mockedUseAccountSession = jest.mocked(useAccountSession);
const mockedSubscribe = jest.mocked(subscribeToPlusEntitlement);
const mockedDisconnect = jest.mocked(disconnectPlusPurchasesIdentity);

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

describe('PlusEntitlementSync', () => {
  beforeEach(() => {
    mockedDisconnect.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await cleanup();
    jest.clearAllMocks();
  });

  test('updates shared caches and removes the RevenueCat listener', async () => {
    mockedUseAccountSession.mockReturnValue(
      account({
        kind: 'signed-in',
        user: {
          id: 'cognito-sub-1',
          email: 'matt@example.com',
          displayName: 'Matthew',
          provider: 'apple',
        },
      }),
    );
    const repository = { setSetting: jest.fn().mockResolvedValue(undefined) };
    const unsubscribe = jest.fn();
    let onChange: ((active: boolean) => void) | undefined;
    mockedUseRepository.mockReturnValue(repository as unknown as PillyRepository);
    mockedSubscribe.mockImplementation(async (_accountId, listener) => {
      onChange = listener;
      return unsubscribe;
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(queryKeys.plus.store('cognito-sub-1'), { kind: 'unconfigured' });
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const view = await render(<PlusEntitlementSync />, { wrapper });
    await waitFor(() =>
      expect(mockedSubscribe).toHaveBeenCalledWith('cognito-sub-1', expect.any(Function)),
    );
    onChange?.(true);

    await waitFor(() =>
      expect(repository.setSetting).toHaveBeenCalledWith(
        plusEntitlementSettingKey('cognito-sub-1'),
        'true',
      ),
    );
    expect(
      queryClient.getQueryData(queryKeys.setting(plusEntitlementSettingKey('cognito-sub-1'))),
    ).toBe('true');
    await waitFor(() =>
      expect(queryClient.getQueryState(queryKeys.plus.store('cognito-sub-1'))?.isInvalidated).toBe(
        true,
      ),
    );

    view.unmount();
    await waitFor(() => expect(unsubscribe).toHaveBeenCalledTimes(1));
    queryClient.clear();
  });

  test('disconnects RevenueCat without subscribing when Pilly is local-only', async () => {
    mockedUseAccountSession.mockReturnValue(account({ kind: 'local', user: null }));
    mockedUseRepository.mockReturnValue({} as PillyRepository);
    const queryClient = new QueryClient();
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    await render(<PlusEntitlementSync />, { wrapper });

    await waitFor(() => expect(mockedDisconnect).toHaveBeenCalledTimes(1));
    expect(mockedSubscribe).not.toHaveBeenCalled();
    queryClient.clear();
  });
});
