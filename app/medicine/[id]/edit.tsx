import { useLocalSearchParams } from 'expo-router';

import { EditMedicineScreen } from '@/screens/edit-medicine';

export default function EditMedicineRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EditMedicineScreen medicationId={id} />;
}
