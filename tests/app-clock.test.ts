type AppClockService = typeof import('@/services/app-clock');

function loadAppClock(hour?: string): AppClockService {
  if (hour === undefined) delete process.env.EXPO_PUBLIC_E2E_CLOCK_HOUR;
  else process.env.EXPO_PUBLIC_E2E_CLOCK_HOUR = hour;

  let service: AppClockService | undefined;
  jest.isolateModules(() => {
    service = jest.requireActual<AppClockService>('@/services/app-clock');
  });
  if (!service) throw new Error('App clock service did not load.');
  return service;
}

describe('app clock', () => {
  const originalHour = process.env.EXPO_PUBLIC_E2E_CLOCK_HOUR;

  afterEach(() => {
    if (originalHour === undefined) delete process.env.EXPO_PUBLIC_E2E_CLOCK_HOUR;
    else process.env.EXPO_PUBLIC_E2E_CLOCK_HOUR = originalHour;
    jest.resetModules();
  });

  it('uses the real supplied date outside an E2E build', () => {
    const { appNow, hasFixedE2EClock } = loadAppClock();
    const source = new Date(2026, 7, 17, 8, 14, 30, 125);

    expect(appNow(source)).toBe(source);
    expect(hasFixedE2EClock()).toBe(false);
  });

  it('fixes only the local hour for deterministic E2E availability', () => {
    const { appNow, hasFixedE2EClock } = loadAppClock('23');
    const source = new Date(2026, 7, 17, 8, 14, 30, 125);
    const result = appNow(source);

    expect(result).not.toBe(source);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(7);
    expect(result.getDate()).toBe(17);
    expect(result.getHours()).toBe(23);
    expect(result.getMinutes()).toBe(59);
    expect(result.getSeconds()).toBe(0);
    expect(hasFixedE2EClock()).toBe(true);
  });

  it('ignores malformed or out-of-range E2E hours', () => {
    const { appNow, hasFixedE2EClock } = loadAppClock('24');
    const source = new Date(2026, 7, 17, 8, 14);

    expect(appNow(source)).toBe(source);
    expect(hasFixedE2EClock()).toBe(false);
  });
});
