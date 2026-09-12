import type Purchases from 'react-native-purchases';
import type { IntroEligibility } from 'react-native-purchases';

import {
  normalizePlusOffers,
  plusPackageForPlan,
  type PlusOffer,
  type PlusPlan,
} from './plus-offers';

type PurchasesStoreClient = Pick<
  typeof Purchases,
  | 'getCustomerInfo'
  | 'getOfferings'
  | 'checkTrialOrIntroductoryPriceEligibility'
  | 'INTRO_ELIGIBILITY_STATUS'
>;

export type PlusStoreSnapshot =
  | { kind: 'unconfigured' }
  | {
      kind: 'ready';
      active: boolean;
      checkedAt: string;
      offers: Record<PlusPlan, PlusOffer | null>;
    };

export function hasPlus(customerInfo: {
  entitlements: { active: Record<string, unknown> };
}): boolean {
  return customerInfo.entitlements.active.plus !== undefined;
}

export async function loadPlusStoreSnapshotFromPurchases(
  purchases: PurchasesStoreClient,
  appUserId?: string,
): Promise<PlusStoreSnapshot> {
  const [customerInfo, offerings] = await Promise.all([
    appUserId ? purchases.getCustomerInfo() : Promise.resolve(null),
    purchases.getOfferings(),
  ]);
  const packages = {
    annual: plusPackageForPlan(offerings.current, 'annual'),
    monthly: plusPackageForPlan(offerings.current, 'monthly'),
  };
  const productIdentifiers = Object.values(packages).flatMap((offer) =>
    offer?.product.introPrice ? [offer.product.identifier] : [],
  );
  let eligibility: Record<string, IntroEligibility> = {};
  if (productIdentifiers.length > 0) {
    try {
      eligibility = await purchases.checkTrialOrIntroductoryPriceEligibility(productIdentifiers);
    } catch {
      // An eligibility lookup must not hide otherwise valid store products.
    }
  }

  return {
    kind: 'ready',
    active: customerInfo ? hasPlus(customerInfo) : false,
    checkedAt: customerInfo?.requestDate ?? new Date().toISOString(),
    offers: normalizePlusOffers(
      offerings.current,
      eligibility,
      purchases.INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE,
    ),
  };
}
