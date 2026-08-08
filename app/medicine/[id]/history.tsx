import { useLocalSearchParams } from 'expo-router';

import { DoseHistoryScreen } from '@/screens/dose-history';

export default function DoseHistoryRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <DoseHistoryScreen medicationId={id} />;
}
