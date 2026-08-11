import type { PropsWithChildren } from 'react';
import { cleanup, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { PillyRepository } from '@/data/repositories';
import { useMedicines } from './use-medicines';
import { useRepository } from './use-repository';

jest.mock('./use-repository');

const mockedUseRepository = jest.mocked(useRepository);

describe('useMedicines', () => {
  afterEach(async () => {
    await cleanup();
    jest.clearAllMocks();
  });

  test('loads active and archived medicines for the Medicines route', async () => {
    const listMedications = jest.fn().mockResolvedValue([]);
    mockedUseRepository.mockReturnValue({ listMedications } as unknown as PillyRepository);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = await renderHook(() => useMedicines(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(listMedications).toHaveBeenCalledWith({ includeArchived: true });
  });
});
