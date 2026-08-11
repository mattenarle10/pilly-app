import type { PropsWithChildren } from 'react';
import { cleanup, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { PillyRepository } from '@/storage/repository';
import { useMedicines } from '@/hooks/use-medicines';
import { useRepository } from '@/hooks/use-repository';

jest.mock('@/hooks/use-repository');

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
