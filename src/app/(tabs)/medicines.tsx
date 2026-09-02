import { router } from 'expo-router';

import { MedicinesContent, MedicinesHeader } from '@/ui/components/medicines-content';
import { Screen } from '@/ui/components/screen';
import {
  useMedicineCollectionPhotos,
  useMedicineCollectionPreferences,
} from '@/hooks/use-medicine-collection';
import { useMedicines } from '@/hooks/use-medicines';

export default function MedicinesRoute() {
  const query = useMedicines();
  const preferences = useMedicineCollectionPreferences();
  const photos = useMedicineCollectionPhotos();
  const addMedicine = () => router.push('/medicine/new');

  return (
    <Screen scroll={false} safeAreaEdges={['top']} contentStyle={styles.screen}>
      <MedicinesContent
        header={<MedicinesHeader onAdd={addMedicine} showAdd={query.data?.length !== 0} />}
        medicines={query.data}
        photoUris={photos.photoUris}
        view={preferences.view}
        sort={preferences.sort}
        isLoading={query.isLoading}
        isError={query.isError}
        onAdd={addMedicine}
        onRetry={() => void query.refetch()}
        onViewChange={preferences.setView}
        onSortChange={preferences.setSort}
        onOpenMedicine={(id) => router.push({ pathname: '/medicine/[id]', params: { id } })}
        onOpenArchived={() => router.push('/medicines/archived')}
      />
    </Screen>
  );
}

const styles = { screen: { paddingBottom: 0 } };
