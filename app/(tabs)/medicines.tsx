import { router } from 'expo-router';

import { MedicinesContent, MedicinesHeader, Screen } from '@/ui/components';
import { spacing } from '@/ui/tokens';
import { useMedicines } from '@/hooks';

export default function MedicinesRoute() {
  const query = useMedicines();
  const addMedicine = () => router.push('/medicine/new');

  return (
    <Screen safeAreaEdges={['top']} contentStyle={styles.screen}>
      <MedicinesHeader onAdd={addMedicine} showAdd={query.data?.length !== 0} />
      <MedicinesContent
        medicines={query.data}
        isLoading={query.isLoading}
        isError={query.isError}
        onAdd={addMedicine}
        onRetry={() => void query.refetch()}
        onOpenMedicine={(id) => router.push({ pathname: '/medicine/[id]', params: { id } })}
      />
    </Screen>
  );
}

const styles = { screen: { gap: spacing.xl } };
