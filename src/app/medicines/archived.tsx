import { router } from 'expo-router';

import {
  useMedicineCollectionPhotos,
  useMedicineCollectionPreferences,
} from '@/hooks/use-medicine-collection';
import { useMedicines } from '@/hooks/use-medicines';
import { MedicinesContent } from '@/ui/components/medicines-content';
import { Screen } from '@/ui/components/screen';

export default function ArchivedMedicinesRoute() {
  const query = useMedicines();
  const preferences = useMedicineCollectionPreferences();
  const photos = useMedicineCollectionPhotos();

  return (
    <Screen
      scroll={false}
      safeAreaEdges={['bottom']}
      contentStyle={{ paddingTop: 0, paddingBottom: 0 }}
    >
      <MedicinesContent
        archived
        medicines={query.data}
        photoUris={photos.photoUris}
        view={preferences.view}
        sort={preferences.sort}
        isLoading={query.isLoading}
        isError={query.isError}
        onRetry={() => void query.refetch()}
        onViewChange={preferences.setView}
        onSortChange={preferences.setSort}
        onOpenMedicine={(id) => router.push({ pathname: '/medicine/[id]', params: { id } })}
      />
    </Screen>
  );
}
