import { cleanup, render, waitFor } from '@testing-library/react-native';

import { OnboardingJourney } from '@/ui/illustrations/onboarding-journey';

const mockWithTiming = jest.fn((value: unknown) => value);

jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    __esModule: true,
    default: { View, createAnimatedComponent: (component: unknown) => component },
    Easing: { cubic: 'cubic', out: (value: unknown) => value },
    useAnimatedProps: (updater: () => object) => updater(),
    useAnimatedStyle: (updater: () => object) => updater(),
    useReducedMotion: () => true,
    useSharedValue: (value: unknown) => ({ value }),
    withDelay: (_delay: number, value: unknown) => value,
    withTiming: mockWithTiming,
  };
});

describe('OnboardingJourney', () => {
  afterEach(async () => {
    await cleanup();
    jest.clearAllMocks();
  });

  test('renders the final SVG story without motion when Reduce Motion is enabled', async () => {
    const screen = await render(<OnboardingJourney stage="welcome" />);
    expect(screen.toJSON()).not.toBeNull();
    await waitFor(() => expect(mockWithTiming).not.toHaveBeenCalled());
  });

  test('renders the setup story', async () => {
    const screen = await render(<OnboardingJourney stage="setup" />);
    expect(screen.toJSON()).not.toBeNull();
  });
});
