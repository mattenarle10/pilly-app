import type { MedicationAppearanceColor, MedicationAppearanceShape } from '@/models/medication';
import { MedicationAppearance } from './medication-appearance';

export type MedicationAppearancePreview3DProps = {
  shape: MedicationAppearanceShape;
  color: MedicationAppearanceColor;
  secondaryColor: MedicationAppearanceColor;
  active: boolean;
};

export function MedicationAppearancePreview3D(props: MedicationAppearancePreview3DProps) {
  return <MedicationAppearance {...props} size="medium" />;
}
