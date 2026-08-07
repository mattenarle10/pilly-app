import { Platform } from 'react-native';
import { env } from '@/config/env';

let configured = false;

async function purchasesModule() {
  if (Platform.OS !== 'ios' || !env.EXPO_PUBLIC_REVENUECAT_IOS_KEY) return null;
  const { default: Purchases } = await import('react-native-purchases');
  if (!configured) {
    Purchases.configure({ apiKey: env.EXPO_PUBLIC_REVENUECAT_IOS_KEY });
    configured = true;
  }
  return Purchases;
}

export async function loadPlusOffer() {
  const purchases = await purchasesModule();
  if (!purchases) return null;
  const offerings = await purchases.getOfferings();
  return offerings.current?.availablePackages[0] ?? null;
}

function hasPlus(customerInfo: { entitlements: { active: Record<string, unknown> } }): boolean {
  return customerInfo.entitlements.active.plus !== undefined;
}

export async function refreshPlusEntitlement(): Promise<boolean | null> {
  const purchases = await purchasesModule();
  if (!purchases) return null;
  return hasPlus(await purchases.getCustomerInfo());
}

export async function purchasePlus(): Promise<boolean> {
  const purchases = await purchasesModule();
  if (!purchases) throw new Error('Store setup is not available in this build.');
  const offer = await loadPlusOffer();
  if (!offer) throw new Error('Pilly Plus is not available in the store yet.');
  const result = await purchases.purchasePackage(offer);
  return hasPlus(result.customerInfo);
}

export async function restorePlus(): Promise<boolean> {
  const purchases = await purchasesModule();
  if (!purchases) throw new Error('Store setup is not available in this build.');
  return hasPlus(await purchases.restorePurchases());
}
