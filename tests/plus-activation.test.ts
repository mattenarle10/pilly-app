import type { BootstrapResponse } from '@/models/sync';
import { waitForActivePlusEntitlement } from '@/services/plus-activation';

function bootstrap(isActive: boolean): BootstrapResponse {
  return {
    serverCursor: 0,
    hasCloudData: false,
    changes: [],
    entitlement: { isActive, productId: null, expiresAt: null },
  };
}

describe('Pilly Plus cloud activation', () => {
  test('retries webhook propagation and returns as soon as AWS is active', async () => {
    const fetchBootstrap = jest
      .fn<Promise<BootstrapResponse>, []>()
      .mockResolvedValueOnce(bootstrap(false))
      .mockRejectedValueOnce(new Error('temporary network error'))
      .mockResolvedValueOnce(bootstrap(true));
    const wait = jest.fn(async () => undefined);

    await expect(waitForActivePlusEntitlement(fetchBootstrap, wait)).resolves.toEqual(
      bootstrap(true),
    );
    expect(wait.mock.calls).toEqual([[1_000], [2_000]]);
    expect(fetchBootstrap).toHaveBeenCalledTimes(3);
  });

  test('exhausts the bounded retry window without revoking local Plus', async () => {
    const fetchBootstrap = jest.fn(async () => bootstrap(false));
    const wait = jest.fn(async () => undefined);

    await expect(waitForActivePlusEntitlement(fetchBootstrap, wait)).resolves.toBeNull();
    expect(wait.mock.calls).toEqual([[1_000], [2_000], [4_000], [8_000]]);
    expect(fetchBootstrap).toHaveBeenCalledTimes(5);
  });
});
