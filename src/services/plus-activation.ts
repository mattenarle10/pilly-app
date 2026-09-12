import type { BootstrapResponse } from '@/models/sync';

const activationRetryDelays = [0, 1_000, 2_000, 4_000, 8_000] as const;

export async function waitForActivePlusEntitlement(
  fetchBootstrap: () => Promise<BootstrapResponse>,
  wait: (delay: number) => Promise<void> = (delay) =>
    new Promise((resolve) => setTimeout(resolve, delay)),
): Promise<BootstrapResponse | null> {
  for (const delay of activationRetryDelays) {
    if (delay > 0) await wait(delay);
    try {
      const bootstrap = await fetchBootstrap();
      if (bootstrap.entitlement.isActive) return bootstrap;
    } catch {
      // A later attempt may succeed after the purchase webhook reaches AWS.
    }
  }
  return null;
}
