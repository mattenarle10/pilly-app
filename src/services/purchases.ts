import { Platform } from 'react-native';
import type { CustomerInfoUpdateListener, PurchasesPackage } from 'react-native-purchases';
import { z } from 'zod';

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

export type PlusOffer = {
  packageIdentifier: string;
  productIdentifier: string;
  localizedPrice: string;
};

export type PlusStoreSnapshot =
  { kind: 'unconfigured' } | { kind: 'ready'; active: boolean; offer: PlusOffer | null };

export type PlusActionResult = { kind: 'active' } | { kind: 'inactive' } | { kind: 'cancelled' };

async function purchasesModule() {
  if (Platform.OS !== 'ios' || !purchaseEnvironment.EXPO_PUBLIC_REVENUECAT_IOS_KEY) return null;
  const { default: Purchases } = await import('react-native-purchases');
  if (!configured) {
    Purchases.configure({ apiKey: purchaseEnvironment.EXPO_PUBLIC_REVENUECAT_IOS_KEY });
    configured = true;
  }
  return Purchases;
}

function hasPlus(customerInfo: { entitlements: { active: Record<string, unknown> } }): boolean {
  return customerInfo.entitlements.active[plusEntitlementIdentifier] !== undefined;
}

function toOffer(offer: PurchasesPackage | null): PlusOffer | null {
  if (!offer) return null;
  return {
    packageIdentifier: offer.identifier,
    productIdentifier: offer.product.identifier,
    localizedPrice: offer.product.priceString,
  };
}

export function getPlusPreviewMode(): PlusPreviewMode {
  if (!__DEV__) return 'store';
  return purchaseEnvironment.EXPO_PUBLIC_PLUS_PREVIEW_MODE ?? 'store';
}

export function arePlusPurchasesEnabled(): boolean {
  return purchaseEnvironment.EXPO_PUBLIC_PLUS_PURCHASES_ENABLED === 'true';
}

export function isPlusPurchasesSupported(): boolean {
  return Platform.OS === 'ios';
}

export async function loadPlusStoreSnapshot(): Promise<PlusStoreSnapshot> {
  const purchases = await purchasesModule();
  if (!purchases) return { kind: 'unconfigured' };

  const [customerInfo, offerings] = await Promise.all([
    purchases.getCustomerInfo(),
    purchases.getOfferings(),
  ]);

  return {
    kind: 'ready',
    active: hasPlus(customerInfo),
    offer: toOffer(offerings.current?.lifetime ?? null),
  };
}

export async function purchasePlus(): Promise<PlusActionResult> {
  if (!arePlusPurchasesEnabled()) {
    throw new Error('Purchases are not enabled in this build yet.');
  }

  const purchases = await purchasesModule();
  if (!purchases) throw new Error('Store setup is not available in this build.');

  const offerings = await purchases.getOfferings();
  const lifetime = offerings.current?.lifetime;
  if (!lifetime) throw new Error('Pilly Plus is not available in the store yet.');

  try {
    const result = await purchases.purchasePackage(lifetime);
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

export async function restorePlus(): Promise<PlusActionResult> {
  const purchases = await purchasesModule();
  if (!purchases) throw new Error('Store setup is not available in this build.');
  return { kind: hasPlus(await purchases.restorePurchases()) ? 'active' : 'inactive' };
}

export async function subscribeToPlusEntitlement(
  onChange: (active: boolean) => void,
): Promise<() => void> {
  if (getPlusPreviewMode() !== 'store') return () => undefined;
  const purchases = await purchasesModule();
  if (!purchases) return () => undefined;

  const listener: CustomerInfoUpdateListener = (customerInfo) => onChange(hasPlus(customerInfo));
  purchases.addCustomerInfoUpdateListener(listener);
  return () => {
    purchases.removeCustomerInfoUpdateListener(listener);
  };
}
