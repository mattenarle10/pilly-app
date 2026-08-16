import { useState } from 'react';

import { PillyField } from './pilly-field';
import {
  medicationAppearanceColorSchema,
  normalizeMedicationAppearanceColor,
  type MedicationAppearanceColor,
} from '@/models/medication';

type Props = {
  label: string;
  value: MedicationAppearanceColor;
  onChange: (value: MedicationAppearanceColor) => void;
};

export function MedicationColorPicker({ label, value, onChange }: Props) {
  return <HexColorField key={value} label={label} value={value} onChange={onChange} />;
}

function HexColorField({ label, value, onChange }: Props) {
  const [draft, setDraft] = useState(value);

  return (
    <PillyField
      label={label}
      value={draft}
      onChangeText={(next) => {
        setDraft(next);
        if (medicationAppearanceColorSchema.safeParse(next).success) {
          onChange(normalizeMedicationAppearanceColor(next));
        }
      }}
      placeholder="#RRGGBB"
      autoCapitalize="characters"
      autoCorrect={false}
      maxLength={7}
    />
  );
}
