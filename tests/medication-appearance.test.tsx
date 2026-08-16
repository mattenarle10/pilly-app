import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';

import { MedicationAppearance } from '@/ui/components/medication-appearance';

describe('MedicationAppearance', () => {
  test('renders independently selected capsule colors', async () => {
    const screen = await render(
      <MedicationAppearance
        shape="capsule"
        size="medium"
        color="#D96C8A"
        secondaryColor="#7470B8"
      />,
    );

    expect(
      StyleSheet.flatten(
        screen.getByTestId('pill-body', { includeHiddenElements: true }).props.style,
      ),
    ).toMatchObject({ backgroundColor: '#D96C8A' });
    expect(
      StyleSheet.flatten(
        screen.getByTestId('pill-second-half', { includeHiddenElements: true }).props.style,
      ),
    ).toMatchObject({ backgroundColor: '#7470B8' });
  });

  test('keeps the second color out of single-color shapes', async () => {
    const screen = await render(
      <MedicationAppearance shape="round" size="medium" color="#F2B58A" secondaryColor="#7470B8" />,
    );

    expect(screen.queryByTestId('pill-second-half', { includeHiddenElements: true })).toBeNull();
  });

  test('keeps the Today cue quieter than the list cue', async () => {
    const screen = await render(
      <>
        <MedicationAppearance shape="capsule" size="medium" color="#D96C8A" display="mini" />
        <MedicationAppearance shape="capsule" size="medium" color="#D96C8A" display="compact" />
      </>,
    );
    const appearances = screen.getAllByTestId('pill-body', { includeHiddenElements: true });
    expect(appearances).toHaveLength(2);
    const mini = appearances[0]!;
    const compact = appearances[1]!;
    const miniStyle = StyleSheet.flatten(mini.props.style);
    const compactStyle = StyleSheet.flatten(compact.props.style);

    expect(miniStyle.width).toBeLessThan(compactStyle.width);
    expect(miniStyle.height).toBeLessThan(compactStyle.height);
  });
});
