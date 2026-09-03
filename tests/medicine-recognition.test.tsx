import { cleanup, render } from '@testing-library/react-native';

import type { StoredMedicationForm } from '@/models/medication';
import { MedicineRecognition } from '@/ui/components/medicine-recognition';

const forms: StoredMedicationForm[] = [
  'tablet',
  'capsule',
  'liquid',
  'injection',
  'drops',
  'inhaler',
  'other',
];

describe('medicine recognition', () => {
  afterEach(cleanup);

  test.each(forms)('renders the %s form at compact density', async (form) => {
    const screen = await render(
      <MedicineRecognition
        form={form}
        tabletShape="round"
        size="medium"
        color="#F3CCD7"
        secondaryColor="#FBE9DE"
        display="compact"
      />,
    );

    expect(screen.getByTestId(`medicine-form-${form}`)).toBeOnTheScreen();
  });

  test('owns an optional semantic label while keeping its drawing decorative', async () => {
    const screen = await render(
      <MedicineRecognition
        form="drops"
        tabletShape="round"
        size="medium"
        color="#F3CCD7"
        accessibilityLabel="Rose drops"
      />,
    );

    expect(screen.getByLabelText('Rose drops')).toBeOnTheScreen();
  });
});
