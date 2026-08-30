import type { IntroEligibility, PurchasesOffering, PurchasesPackage } from 'react-native-purchases';

import { normalizePlusOffers, plusPackageForPlan } from '@/services/plus-offers';

function product(identifier: string, priceString: string, introPrice: object | null = null) {
  return {
    identifier,
    priceString,
    pricePerMonthString: priceString,
    introPrice,
  };
}

function purchasePackage(identifier: string, productValue: ReturnType<typeof product>) {
  return { identifier, product: productValue } as PurchasesPackage;
}

describe('Pilly Plus offering normalization', () => {
  const annual = purchasePackage(
    '$rc_annual',
    product('pilly_plus_annual', '$49.99', {
      priceString: '$0.00',
      period: 'P1W',
      cycles: 1,
    }),
  );
  const monthly = purchasePackage('$rc_monthly', product('pilly_plus_monthly', '$4.99'));
  const lifetime = purchasePackage('$rc_lifetime', product('pilly_plus_lifetime', '$99.99'));
  const offering = { annual, monthly, lifetime } as PurchasesOffering;

  test('maps annual and monthly packages with eligible live introductory state', () => {
    const eligibility = {
      pilly_plus_annual: {
        status: 2 as IntroEligibility['status'],
        description: 'eligible',
      },
      pilly_plus_monthly: {
        status: 3 as IntroEligibility['status'],
        description: 'no introductory offer',
      },
    };

    expect(normalizePlusOffers(offering, eligibility, 2)).toEqual({
      annual: {
        plan: 'annual',
        packageIdentifier: '$rc_annual',
        productIdentifier: 'pilly_plus_annual',
        localizedPrice: '$49.99',
        localizedPricePerMonth: '$49.99',
        introductoryOffer: { localizedPrice: '$0.00', period: 'P1W', cycles: 1 },
      },
      monthly: {
        plan: 'monthly',
        packageIdentifier: '$rc_monthly',
        productIdentifier: 'pilly_plus_monthly',
        localizedPrice: '$4.99',
        localizedPricePerMonth: '$4.99',
        introductoryOffer: null,
      },
    });
  });

  test('omits unverified introductory copy without hiding valid products', () => {
    expect(normalizePlusOffers(offering, {}, 2)).toMatchObject({
      annual: { introductoryOffer: null },
      monthly: { introductoryOffer: null },
    });
  });

  test('selects only subscription packages and ignores the lifetime draft', () => {
    expect(plusPackageForPlan(offering, 'monthly')).toBe(monthly);
    expect(plusPackageForPlan(offering, 'annual')).toBe(annual);
    expect(plusPackageForPlan({ annual: null, monthly: null }, 'annual')).not.toBe(lifetime);
  });
});
