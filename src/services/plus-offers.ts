import type {
  IntroEligibility,
  PurchasesIntroPrice,
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases';

export type PlusPlan = 'annual' | 'monthly';

export type PlusIntroductoryOffer = {
  localizedPrice: string;
  period: string;
  cycles: number;
};

export type PlusOffer = {
  plan: PlusPlan;
  packageIdentifier: string;
  productIdentifier: string;
  localizedPrice: string;
  localizedPricePerMonth: string | null;
  introductoryOffer: PlusIntroductoryOffer | null;
};

export type PlusOffers = Record<PlusPlan, PlusOffer | null>;

function toIntroductoryOffer(
  introPrice: PurchasesIntroPrice | null,
  eligibility: IntroEligibility | undefined,
  eligibleStatus: number,
): PlusIntroductoryOffer | null {
  if (!introPrice || eligibility?.status !== eligibleStatus) return null;
  return {
    localizedPrice: introPrice.priceString,
    period: introPrice.period,
    cycles: introPrice.cycles,
  };
}

function toOffer(
  plan: PlusPlan,
  offer: PurchasesPackage | null,
  eligibility: IntroEligibility | undefined,
  eligibleStatus: number,
): PlusOffer | null {
  if (!offer) return null;
  return {
    plan,
    packageIdentifier: offer.identifier,
    productIdentifier: offer.product.identifier,
    localizedPrice: offer.product.priceString,
    localizedPricePerMonth: offer.product.pricePerMonthString,
    introductoryOffer: toIntroductoryOffer(offer.product.introPrice, eligibility, eligibleStatus),
  };
}

export function plusPackageForPlan(
  offering: Pick<PurchasesOffering, 'annual' | 'monthly'> | null,
  plan: PlusPlan,
): PurchasesPackage | null {
  return offering?.[plan] ?? null;
}

export function normalizePlusOffers(
  offering: Pick<PurchasesOffering, 'annual' | 'monthly'> | null,
  eligibility: Record<string, IntroEligibility>,
  eligibleStatus: number,
): PlusOffers {
  const annual = plusPackageForPlan(offering, 'annual');
  const monthly = plusPackageForPlan(offering, 'monthly');
  return {
    annual: toOffer(
      'annual',
      annual,
      annual ? eligibility[annual.product.identifier] : undefined,
      eligibleStatus,
    ),
    monthly: toOffer(
      'monthly',
      monthly,
      monthly ? eligibility[monthly.product.identifier] : undefined,
      eligibleStatus,
    ),
  };
}
