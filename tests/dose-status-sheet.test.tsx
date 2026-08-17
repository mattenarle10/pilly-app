import type { ReactNode } from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react-native';

import { DoseStatusSheet } from '@/ui/components/dose-status-sheet';
import { buildScheduledDose } from './support/builders';

jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    __esModule: true,
    default: { View },
    ReduceMotion: { System: 'system' },
    useAnimatedStyle: (updater: () => object) => updater(),
    useSharedValue: (value: unknown) => ({ value }),
    withTiming: (value: unknown) => value,
  };
});

jest.mock('@/ui/components/pilly-sheet', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { Text, View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    PillySheet: ({ title, children }: { title: string; children: ReactNode }) =>
      React.createElement(View, null, React.createElement(Text, null, title), children),
  };
});

describe('DoseStatusSheet', () => {
  afterEach(cleanup);

  test('exposes concise status labels and records a correction', async () => {
    const onSelect = jest.fn();
    const screen = await render(
      <DoseStatusSheet
        dose={buildScheduledDose({ status: 'taken' })}
        visible
        busy={false}
        onSelect={onSelect}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByRole('radio', { name: 'Taken' }).props.accessibilityState).toEqual({
      selected: true,
      disabled: false,
    });
    fireEvent.press(screen.getByRole('radio', { name: 'Skipped' }));
    expect(onSelect).toHaveBeenCalledWith('skipped');
    expect(screen.getByRole('radio', { name: 'Not yet' })).toBeTruthy();
  });
});
