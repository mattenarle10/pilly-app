import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AppState } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/hooks/query-keys';
import { useAccountSession } from '@/hooks/use-account-session';
import { usePlus } from '@/hooks/use-plus';
import { reconcileMedicinePhotoTransfers } from '@/services/medicine-image-transfer';
import { PillyRepository } from '@/storage/repository';

export function MedicineImageTransferSync() {
  const database = useSQLiteContext();
  const repository = useMemo(() => new PillyRepository(database), [database]);
  const queryClient = useQueryClient();
  const account = useAccountSession();
  const plus = usePlus();
  const accountId = account.state.kind === 'signed-in' ? account.state.user.id : null;
  const active = accountId !== null && plus.state.active;
  const taskRef = useRef<Promise<void> | null>(null);

  const reconcile = useCallback(async () => {
    if (!active || taskRef.current) return;
    const task = reconcileMedicinePhotoTransfers(repository).then(async (medicationIds) => {
      await Promise.all(
        medicationIds.map((medicationId) =>
          queryClient.invalidateQueries({ queryKey: queryKeys.medicationImage(medicationId) }),
        ),
      );
    });
    taskRef.current = task;
    await task.finally(() => {
      taskRef.current = null;
    });
  }, [active, queryClient, repository]);

  useEffect(() => {
    const run = () => void reconcile().catch(() => undefined);
    const timer = setTimeout(run, 0);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') run();
    });
    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, [reconcile]);

  return null;
}
