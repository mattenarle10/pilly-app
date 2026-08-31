import { Platform } from 'react-native';
import type { CustomerInfoUpdateListener, IntroEligibility } from 'react-native-purchases';
import { z } from 'zod';

import {
  normalizePlusOffers,
  plusPackageForPlan,
  type PlusOffer,
  type PlusPlan,
} from './plus-offers';

export type { PlusOffer, PlusPlan } from './plus-offers';

const purchaseEnvironmentSchema = z.object({
  EXPO_PUBLIC_REVENUECAT_IOS_KEY: z.string().min(1).optional(),
  EXPO_PUBLIC_PLUS_PREVIEW_MODE: z.enum(['store', 'free', 'active']).optional(),
  EXPO_PUBLIC_PLUS_PURCHASES_ENABLED: z.enum(['true', 'false']).optional(),
});

const purchaseEnvironment = purchaseEnvironmentSchema.parse({
  EXPO_PUBLIC_REVENUECAT_IOS_KEY: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || undefined,
  EXPO_PUBLIC_PLUS_PREVIEW_MODE: process.env.EXPO_PUBLIC_PLUS_PREVIEW_MODE || undefined,
  EXPO_PUBLIC_PLUS_PURCHASES_ENABLED: process.env.EXPO_PUBLIC_PLUS_PURCHASES_ENABLED || undefined,
});

const plusEntitlementIdentifier = 'plus';

let configured = false;

export type PlusPreviewMode = 'store' | 'free' | 'active';

export type PlusStoreSnapshot =
  | { kind: 'unconfigured' }
  | {
      kind: 'ready';
      active: boolean;
      offers: Record<PlusPlan, PlusOffer | null>;
    };

export type PlusActionResult = { kind: 'active' } | { kind: 'inactive' } | { kind: 'cancelled' };

async function purchasesModule(appUserId?: string) {
  if (Platform.OS !== 'ios' || !purchaseEnvironment.EXPO_PUBLIC_REVENUECAT_IOS_KEY) return null;
  const { default: Purchases } = await import('react-native-purchases');
  if (!configured) {
    Purchases.configure({
      apiKey: purchaseEnvironment.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
      ...(appUserId ? { appUserID: appUserId } : {}),
    });
    configured = true;
  } else if (appUserId && (await Purchases.getAppUserID()) !== appUserId) {
    await Purchases.logIn(appUserId);
  }
  return Purchases;
}

function hasPlus(customerInfo: { entitlements: { active: Record<string, unknown> } }): boolean {
  return customerInfo.entitlements.active[plusEntitlementIdentifier] !== undefined;
}

export function getPlusPreviewMode(): PlusPreviewMode {
  if (!__DEV__) return 'store';
  return purchaseEnvironment.EXPO_PUBLIC_PLUS_PREVIEW_MODE ?? 'store';
}

export function arePlusPurchasesEnabled(): boolean {
  return purchaseEnvironment.EXPO_PUBLIC_PLUS_PURCHASES_ENABLED === 'true';
}

export function isPlusPurchasesSupported(): boolean {
  return (
    Platform.OS === 'ios' &&
    (__DEV__ || Boolean(purchaseEnvironment.EXPO_PUBLIC_REVENUECAT_IOS_KEY))
  );
}

export async function loadPlusStoreSnapshot(appUserId?: string): Promise<PlusStoreSnapshot> {
  const purchases = await purchasesModule(appUserId);
  if (!purchases) return { kind: 'unconfigured' };

  const [customerInfo, offerings] = await Promise.all([
    purchases.getCustomerInfo(),
    purchases.getOfferings(),
  ]);
  const packages = {
    annual: plusPackageForPlan(offerings.current, 'annual'),
    monthly: plusPackageForPlan(offerings.current, 'monthly'),
  };
  const productIdentifiers = Object.values(packages).flatMap((offer) =>
    offer ? [offer.product.identifier] : [],
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
    active: hasPlus(customerInfo),
    offers: normalizePlusOffers(
      offerings.current,
      eligibility,
      purchases.INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE,
    ),
  };
}

export async function purchasePlus(appUserId: string, plan: PlusPlan): Promise<PlusActionResult> {
  if (!arePlusPurchasesEnabled()) {
    throw new Error('Purchases are not enabled in this build yet.');
  }

  const purchases = await purchasesModule(appUserId);
  if (!purchases) throw new Error('Store setup is not available in this build.');

  const offerings = await purchases.getOfferings();
  const offer = plusPackageForPlan(offerings.current, plan);
  if (!offer) throw new Error('That Pilly Plus plan is not available in the store yet.');

  try {
    const result = await purchases.purchasePackage(offer);
    return { kind: hasPlus(result.customerInfo) ? 'active' : 'inactive' };
  } catch (cause) {
    if (
      typeof cause === 'object' &&
      cause !== null &&
      'code' in cause &&
      cause.code === purchases.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
    ) {
      return { kind: 'cancelled' };
    }
    throw cause;
  }
}

export async function restorePlus(appUserId: string): Promise<PlusActionResult> {
  const purchases = await purchasesModule(appUserId);
  if (!purchases) throw new Error('Store setup is not available in this build.');
  return { kind: hasPlus(await purchases.restorePurchases()) ? 'active' : 'inactive' };
}

export async function managePlusSubscription(appUserId: string): Promise<void> {
  const purchases = await purchasesModule(appUserId);
  if (!purchases) throw new Error('Subscription management is not available in this build.');
  await purchases.showManageSubscriptions();
}

export async function subscribeToPlusEntitlement(
  appUserId: string,
  onChange: (active: boolean) => void,
): Promise<() => void> {
  if (getPlusPreviewMode() !== 'store') return () => undefined;
  const purchases = await purchasesModule(appUserId);
  if (!purchases) return () => undefined;

  const listener: CustomerInfoUpdateListener = (customerInfo) => onChange(hasPlus(customerInfo));
  purchases.addCustomerInfoUpdateListener(listener);
  return () => {
    purchases.removeCustomerInfoUpdateListener(listener);
  };
}

export async function disconnectPlusPurchasesIdentity(): Promise<void> {
  if (!configured || getPlusPreviewMode() !== 'store') return;
  const purchases = await purchasesModule();
  if (!purchases || (await purchases.isAnonymous())) return;
  await purchases.logOut();
}
