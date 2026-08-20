import { AppState } from 'react-native';
import type { AppStateStatus } from 'react-native';
import { act, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { WidgetSync } from '@/providers/widget-sync';

const mockUpdateTimeline = jest.fn();
const mockListMedications = jest.fn();
const mockUseWeekDoses = jest.fn();
let mockNow = new Date(2026, 7, 15, 23, 55);

jest.mock('@/services/app-clock', () => ({
  appNow: () => mockNow,
}));

jest.mock('@/hooks/use-repository', () => ({
  useRepository: () => ({ listMedications: mockListMedications }),
}));

jest.mock('@/hooks/use-week-doses', () => ({
  useWeekDoses: (dates: readonly Date[], enabled: boolean) => mockUseWeekDoses(dates, enabled),
}));

jest.mock('@/ui/widgets/next-dose-widget', () => ({
  __esModule: true,
  default: { updateTimeline: (...args: unknown[]) => mockUpdateTimeline(...args) },
}));

describe('widget synchronization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNow = new Date(2026, 7, 15, 23, 55);
    mockListMedications.mockResolvedValue([]);
    mockUseWeekDoses.mockImplementation((dates: readonly Date[]) => ({
      data: dates.map(() => []),
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('rebases the widget query when Pilly returns on a new local day', async () => {
    let appStateListener: ((status: AppStateStatus) => void) | undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
      appStateListener = listener;
      return { remove: jest.fn() };
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const screen = await render(
      <QueryClientProvider client={queryClient}>
        <WidgetSync />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(mockUpdateTimeline).toHaveBeenCalled());
    expect(mockUseWeekDoses.mock.calls.at(-1)?.[0]?.[0]).toEqual(new Date(2026, 7, 15));

    mockNow = new Date(2026, 7, 16, 8, 0);
    await act(async () => appStateListener?.('active'));

    await waitFor(() =>
      expect(mockUseWeekDoses.mock.calls.at(-1)?.[0]?.[0]).toEqual(new Date(2026, 7, 16)),
    );
    await screen.unmount();
    queryClient.clear();
  });
});
