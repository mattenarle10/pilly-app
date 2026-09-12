import { Platform } from 'react-native';
import type { CustomerInfoUpdateListener } from 'react-native-purchases';
import { z } from 'zod';

import { plusPackageForPlan, type PlusPlan } from './plus-offers';
import { createAsyncOperationQueue } from './async-operation-queue';
import { hasPlus, loadPlusStoreSnapshotFromPurchases, type PlusStoreSnapshot } from './plus-store';

export type { PlusOffer, PlusPlan } from './plus-offers';
export type { PlusStoreSnapshot } from './plus-store';

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

let configured = false;
const serializeIdentityChange = createAsyncOperationQueue();

export type PlusPreviewMode = 'store' | 'free' | 'active';

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
  } else if (appUserId) {
    await serializeIdentityChange(async () => {
      if ((await Purchases.getAppUserID()) !== appUserId) await Purchases.logIn(appUserId);
    });
  }
  return Purchases;
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

  return loadPlusStoreSnapshotFromPurchases(purchases, appUserId);
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
  onChange: (value: { active: boolean; checkedAt: string }) => void,
): Promise<() => void> {
  if (getPlusPreviewMode() !== 'store') return () => undefined;
  const purchases = await purchasesModule(appUserId);
  if (!purchases) return () => undefined;

  const listener: CustomerInfoUpdateListener = (customerInfo) =>
    onChange({ active: hasPlus(customerInfo), checkedAt: customerInfo.requestDate });
  purchases.addCustomerInfoUpdateListener(listener);
  return () => {
    purchases.removeCustomerInfoUpdateListener(listener);
  };
}

export async function disconnectPlusPurchasesIdentity(): Promise<void> {
  if (!configured || getPlusPreviewMode() !== 'store') return;
  const purchases = await purchasesModule();
  if (!purchases) return;
  await serializeIdentityChange(async () => {
    if (!(await purchases.isAnonymous())) await purchases.logOut();
  });
}
