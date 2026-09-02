import type { PropsWithChildren } from 'react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { PillyRepository } from '@/storage/repository';
import type { Medication } from '@/models/medication';

import { useProfile } from '@/hooks/use-profile';
import { useRepository } from '@/hooks/use-repository';

jest.mock('@/hooks/use-repository');

const mockedUseRepository = jest.mocked(useRepository);
const queryClients = new Set<QueryClient>();

function medication(id: string, archived: boolean): Medication {
  return {
    id,
    name: `Medicine ${id}`,
    instructions: '',
    supplyCount: 7,
    appearanceShape: 'capsule',
    appearanceSize: 'medium',
    appearanceColor: '#F3CCD7',
    appearanceSecondaryColor: '#F3CCD7',
    createdAt: '2026-08-11T00:00:00.000Z',
    updatedAt: '2026-08-11T00:00:00.000Z',
    archivedAt: archived ? '2026-08-11T01:00:00.000Z' : null,
    timeZoneIdentifier: 'Asia/Manila',
  };
}

async function setup(settings: Record<string, string | null>) {
  const repository = {
    getSetting: jest.fn((key: string) => Promise.resolve(settings[key] ?? null)),
    setSetting: jest.fn().mockResolvedValue(undefined),
    saveProfileName: jest.fn().mockResolvedValue(undefined),
    listMedications: jest
      .fn()
      .mockResolvedValue([medication('active', false), medication('archived', true)]),
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

  return { repository, queryClient, ...(await renderHook(() => useProfile(), { wrapper })) };
}

describe('useProfile', () => {
  afterEach(async () => {
    await cleanup();
    queryClients.forEach((queryClient) => queryClient.clear());
    queryClients.clear();
    jest.clearAllMocks();
  });

  test('resolves a legacy name and counts archived medicines', async () => {
    const { repository, result } = await setup({ profileName: 'Matthew Earle' });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.name).toEqual({ firstName: 'Matthew', lastName: 'Earle' });
    expect(result.current.displayName).toBe('Matthew Earle');
    expect(result.current.archivedCount).toBe(1);
    expect(repository.listMedications).toHaveBeenCalledWith({ includeArchived: true });
  });

  test('trims existing split-name settings before displaying them', async () => {
    const { result } = await setup({
      profileFirstName: '  Ada ',
      profileLastName: ' Doe  ',
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.name).toEqual({ firstName: 'Ada', lastName: 'Doe' });
    expect(result.current.displayName).toBe('Ada Doe');
  });

  test('normalizes a saved name and updates every shared setting cache', async () => {
    const { queryClient, repository, result } = await setup({
      profileFirstName: 'Matthew',
      profileLastName: '',
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(() =>
      result.current.saveName.mutateAsync({ firstName: '  Ada ', lastName: ' Doe ' }),
    );

    expect(repository.saveProfileName).toHaveBeenCalledWith('Ada', 'Doe');
    expect(queryClient.getQueryData(['settings', 'profileFirstName'])).toBe('Ada');
    expect(queryClient.getQueryData(['settings', 'profileLastName'])).toBe('Doe');
    expect(queryClient.getQueryData(['settings', 'profileName'])).toBe('Ada Doe');
  });
});
