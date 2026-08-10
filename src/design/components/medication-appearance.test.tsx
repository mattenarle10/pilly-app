import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';

import { colors } from '@/design/tokens';
import { MedicationAppearance } from './medication-appearance';

describe('MedicationAppearance', () => {
  test('renders independently selected capsule colors', async () => {
    const screen = await render(
      <MedicationAppearance shape="capsule" size="medium" tone="rose" secondaryTone="lavender" />,
    );

    expect(
      StyleSheet.flatten(
        screen.getByTestId('pill-body', { includeHiddenElements: true }).props.style,
      ),
    ).toMatchObject({ backgroundColor: colors.brandSoft });
    expect(
      StyleSheet.flatten(
        screen.getByTestId('pill-second-half', { includeHiddenElements: true }).props.style,
      ),
    ).toMatchObject({ backgroundColor: colors.lavenderSoft });
  });

  test('keeps the second color out of single-color shapes', async () => {
    const screen = await render(
      <MedicationAppearance shape="round" size="medium" tone="peach" secondaryTone="lavender" />,
    );

    expect(screen.queryByTestId('pill-second-half', { includeHiddenElements: true })).toBeNull();
  });
});
