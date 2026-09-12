import { createAsyncOperationQueue } from '@/services/async-operation-queue';
import { loadPlusStoreSnapshotFromPurchases } from '@/services/plus-store';

function packageFor(identifier: string, introPrice: object | null) {
  return {
    identifier: `$rc_${identifier}`,
    product: {
      identifier,
      priceString: '$19.99',
      pricePerMonthString: '$1.66',
      introPrice,
    },
  };
}

function purchasesMock() {
  const annual = packageFor('annual-id', {
    price: 0,
    priceString: '$0.00',
    period: 'P1W',
    cycles: 1,
  });
  const monthly = packageFor('monthly-id', null);
  return {
    getCustomerInfo: jest.fn(async () => ({
      requestDate: '2026-09-01T00:00:00.000Z',
      entitlements: { active: {} },
    })),
    getOfferings: jest.fn(async () => ({ current: { annual, monthly } })),
    checkTrialOrIntroductoryPriceEligibility: jest.fn(async () => ({
      'annual-id': { status: 0 },
    })),
    INTRO_ELIGIBILITY_STATUS: { INTRO_ELIGIBILITY_STATUS_ELIGIBLE: 0 },
  };
}

describe('RevenueCat store loading', () => {
  test('loads anonymous prices without customer info and checks only intro products', async () => {
    const purchases = purchasesMock();

    const snapshot = await loadPlusStoreSnapshotFromPurchases(purchases as never);

    expect(snapshot).toMatchObject({ kind: 'ready', active: false });
    expect(purchases.getCustomerInfo).not.toHaveBeenCalled();
    expect(purchases.checkTrialOrIntroductoryPriceEligibility).toHaveBeenCalledWith(['annual-id']);
  });

  test('loads entitlement state only for a connected RevenueCat identity', async () => {
    const purchases = purchasesMock();
    purchases.getCustomerInfo.mockResolvedValue({
      requestDate: '2026-09-01T00:00:00.000Z',
      entitlements: { active: { plus: {} } },
    });

    const snapshot = await loadPlusStoreSnapshotFromPurchases(purchases as never, 'account-1');

    expect(snapshot).toMatchObject({ kind: 'ready', active: true });
    expect(purchases.getCustomerInfo).toHaveBeenCalledTimes(1);
  });

  test('serializes RevenueCat identity changes', async () => {
    const serializeIdentityChange = createAsyncOperationQueue();
    let concurrentChanges = 0;
    let maximumConcurrentChanges = 0;
    const changeIdentity = async () => {
      concurrentChanges += 1;
      maximumConcurrentChanges = Math.max(maximumConcurrentChanges, concurrentChanges);
      await new Promise((resolve) => setTimeout(resolve, 1));
      concurrentChanges -= 1;
    };

    await Promise.all([
      serializeIdentityChange(changeIdentity),
      serializeIdentityChange(changeIdentity),
    ]);

    expect(maximumConcurrentChanges).toBe(1);
  });
});
