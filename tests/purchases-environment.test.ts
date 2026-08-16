type PurchasesService = typeof import('@/services/purchases');

const runtime = globalThis as typeof globalThis & { __DEV__: boolean };
const originalDevelopment = runtime.__DEV__;
const originalApiKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;

function loadPurchases({
  development,
  apiKey,
}: {
  development: boolean;
  apiKey?: string;
}): PurchasesService {
  runtime.__DEV__ = development;
  if (apiKey === undefined) delete process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
  else process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = apiKey;

  let service: PurchasesService | undefined;
  jest.isolateModules(() => {
    jest.doMock('react-native', () => ({ Platform: { OS: 'ios' } }));
    service = jest.requireActual<PurchasesService>('@/services/purchases');
  });
  if (!service) throw new Error('Purchases service did not load.');
  return service;
}

describe('Pilly Plus build availability', () => {
  afterEach(() => {
    runtime.__DEV__ = originalDevelopment;
    if (originalApiKey === undefined) delete process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
    else process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = originalApiKey;
    jest.dontMock('react-native');
    jest.resetModules();
  });

  test('keeps Plus available for local design and journey testing', () => {
    const service = loadPurchases({ development: true });

    expect(service.isPlusPurchasesSupported()).toBe(true);
  });

  test('hides Plus in a production build without store configuration', () => {
    const service = loadPurchases({ development: false });

    expect(service.isPlusPurchasesSupported()).toBe(false);
  });

  test('allows Plus in production only after a RevenueCat key is configured', () => {
    const service = loadPurchases({ development: false, apiKey: 'appl_public_sdk_key' });

    expect(service.isPlusPurchasesSupported()).toBe(true);
  });
});
