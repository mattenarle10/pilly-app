import { useLocalSearchParams } from 'expo-router';

import { MedicineDetailScreen } from '@/screens/medicine-detail';

export default function MedicineDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <MedicineDetailScreen medicationId={id} />;
}
