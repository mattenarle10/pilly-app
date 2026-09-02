import { render } from '@testing-library/react-native';

import { PillyAvatar } from '@/ui/components/pilly-avatar';

jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    __esModule: true,
    default: { View, createAnimatedComponent: (component: unknown) => component },
    ReduceMotion: { System: 'system' },
    useAnimatedStyle: (updater: () => object) => updater(),
    useSharedValue: (value: unknown) => ({ value }),
    withTiming: (value: unknown) => value,
  };
});

describe('Pilly avatar', () => {
  test('uses a calm initial fallback without requiring a photo', async () => {
    const screen = await render(<PillyAvatar displayName="Matthew Enarle" />);

    expect(screen.getByText('M')).toBeOnTheScreen();
  });

  test('renders the account image and Plus state badge together', async () => {
    const screen = await render(
      <PillyAvatar displayName="Matthew" uri="file:///avatar.jpg" plus />,
    );

    expect(screen.getByLabelText('Matthew profile photo')).toBeOnTheScreen();
    expect(screen.queryByText('M')).toBeNull();
  });
});
