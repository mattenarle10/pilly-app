import type { PropsWithChildren } from 'react';
import { cleanup, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { PillyRepository } from '@/data/repositories';
import { plusEntitlementQueryKey, plusEntitlementSettingKey, plusQueryKey } from '@/hooks/use-plus';
import { useRepository } from '@/hooks/use-repository';
import { subscribeToPlusEntitlement } from '@/platform/purchases';

import { PlusEntitlementBridge } from './plus-entitlement-bridge';

jest.mock('@/hooks/use-repository');
jest.mock('@/platform/purchases');

const mockedUseRepository = jest.mocked(useRepository);
const mockedSubscribe = jest.mocked(subscribeToPlusEntitlement);

describe('PlusEntitlementBridge', () => {
  afterEach(async () => {
    await cleanup();
    jest.clearAllMocks();
  });

  test('updates shared caches and removes the RevenueCat listener', async () => {
    const repository = { setSetting: jest.fn().mockResolvedValue(undefined) };
    const unsubscribe = jest.fn();
    let onChange: ((active: boolean) => void) | undefined;
    mockedUseRepository.mockReturnValue(repository as unknown as PillyRepository);
    mockedSubscribe.mockImplementation(async (listener) => {
      onChange = listener;
      return unsubscribe;
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData([...plusQueryKey, 'store'], { kind: 'unconfigured' });
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const view = await render(<PlusEntitlementBridge />, { wrapper });
    await waitFor(() => expect(mockedSubscribe).toHaveBeenCalledTimes(1));
    onChange?.(true);

    await waitFor(() =>
      expect(repository.setSetting).toHaveBeenCalledWith(plusEntitlementSettingKey, 'true'),
    );
    expect(queryClient.getQueryData(plusEntitlementQueryKey)).toBe('true');
    await waitFor(() =>
      expect(queryClient.getQueryState([...plusQueryKey, 'store'])?.isInvalidated).toBe(true),
    );

    view.unmount();
    await waitFor(() => expect(unsubscribe).toHaveBeenCalledTimes(1));
    queryClient.clear();
  });
});
