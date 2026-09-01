import {
  hasFreshCachedPlusEntitlement,
  serializePlusEntitlementCache,
} from '@/services/plus-entitlement-cache';

describe('Plus entitlement cache', () => {
  const checkedAt = '2026-09-01T00:00:00.000Z';
  const now = Date.parse(checkedAt);

  test('keeps active access for RevenueCat’s bounded three-day offline grace', () => {
    const cached = serializePlusEntitlementCache(true, checkedAt);

    expect(hasFreshCachedPlusEntitlement(cached, now + 3 * 24 * 60 * 60 * 1000)).toBe(true);
    expect(hasFreshCachedPlusEntitlement(cached, now + 3 * 24 * 60 * 60 * 1000 + 1)).toBe(false);
  });

  test('fails closed for inactive, legacy, malformed, and future cache values', () => {
    expect(
      hasFreshCachedPlusEntitlement(serializePlusEntitlementCache(false, checkedAt), now),
    ).toBe(false);
    expect(hasFreshCachedPlusEntitlement('true', now)).toBe(false);
    expect(hasFreshCachedPlusEntitlement('{', now)).toBe(false);
    expect(
      hasFreshCachedPlusEntitlement(serializePlusEntitlementCache(true, checkedAt), now - 1),
    ).toBe(false);
  });
});
