import type {
  IntroEligibility,
  PurchasesIntroPrice,
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases';

export type PlusPlan = 'annual' | 'monthly';

export type PlusIntroductoryOffer = {
  price: number;
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
    price: introPrice.price,
    localizedPrice: introPrice.priceString,
    period: introPrice.period,
    cycles: introPrice.cycles,
  };
}

export function introductoryOfferLabel(offer: PlusIntroductoryOffer): string | null {
  const duration = subscriptionPeriodLabel(offer.period, offer.cycles);
  if (!duration) return null;
  return offer.price === 0 ? `${duration} free` : `${duration} at ${offer.localizedPrice}`;
}

function subscriptionPeriodLabel(period: string, cycles: number): string | null {
  if (!Number.isSafeInteger(cycles) || cycles < 1) return null;
  const match = /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?$/.exec(period);
  if (!match) return null;
  const units = [
    ['year', match[1]],
    ['month', match[2]],
    ['week', match[3]],
    ['day', match[4]],
  ] as const;
  const populated = units.filter(([, value]) => value !== undefined);
  if (populated.length !== 1) return null;
  const [unit, value] = populated[0]!;
  const quantity = Number(value) * cycles;
  if (!Number.isSafeInteger(quantity) || quantity < 1) return null;
  return `${quantity} ${unit}${quantity === 1 ? '' : 's'}`;
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
