import type { PropsWithChildren } from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react-native';
import { ActionSheetIOS } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { AccountSessionContextValue } from '@/providers/account-session-provider';
import { useAccountSession } from '@/hooks/use-account-session';
import { useProfile } from '@/hooks/use-profile';
import { useProfileAvatar } from '@/hooks/use-profile-avatar';
import { isPlusPurchasesSupported } from '@/services/purchases';

import ProfileRoute from '@/app/profile';

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  router: {
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
    push: jest.fn(),
    replace: jest.fn(),
  },
}));
jest.mock('@/hooks/use-account-session', () => ({ useAccountSession: jest.fn() }));
jest.mock('@/hooks/use-profile', () => ({ useProfile: jest.fn() }));
jest.mock('@/hooks/use-profile-avatar', () => ({ useProfileAvatar: jest.fn() }));
jest.mock('@/services/purchases', () => ({ isPlusPurchasesSupported: jest.fn() }));
jest.mock('@/ui/components/pilly-modal', () => ({ PillyModal: () => null }));
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

const mockedUseAccountSession = jest.mocked(useAccountSession);
const mockedUseProfile = jest.mocked(useProfile);
const mockedUseProfileAvatar = jest.mocked(useProfileAvatar);
const mockedIsPlusPurchasesSupported = jest.mocked(isPlusPurchasesSupported);
const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function wrapper({ children }: PropsWithChildren) {
  return <SafeAreaProvider initialMetrics={initialMetrics}>{children}</SafeAreaProvider>;
}

function account(state: AccountSessionContextValue['state']): AccountSessionContextValue {
  return {
    state,
    configured: true,
    busy: false,
    signingInWith: null,
    error: null,
    signIn: jest.fn(async () => true),
    signOut: jest.fn(async () => undefined),
    deleteAccount: jest.fn(async () => true),
  };
}

describe('Profile route account boundary', () => {
  beforeEach(() => {
    mockedIsPlusPurchasesSupported.mockReturnValue(true);
    mockedUseProfile.mockReturnValue({
      isLoading: false,
      isError: false,
      name: { firstName: '', lastName: '' },
      displayName: '',
      archivedCount: 0,
      retry: jest.fn(),
      saveName: {
        isPending: false,
        isError: false,
        reset: jest.fn(),
        mutate: jest.fn(),
      },
    } as unknown as ReturnType<typeof useProfile>);
    mockedUseProfileAvatar.mockReturnValue({
      uri: null,
      canUpload: false,
      plusActive: false,
      isBusy: false,
      error: null,
      errorKind: null,
      select: jest.fn(),
      remove: jest.fn(),
      retry: jest.fn(),
    });
  });

  afterEach(async () => {
    await cleanup();
    jest.clearAllMocks();
  });

  test('keeps signed-out free users local and routes account setup through Plus', async () => {
    mockedUseAccountSession.mockReturnValue(account({ kind: 'local', user: null }));

    const screen = await render(<ProfileRoute />, { wrapper });

    expect(screen.getByText('Local profile')).toBeOnTheScreen();
    expect(screen.getByText('Pilly Plus')).toBeOnTheScreen();
    expect(screen.queryByText('Pilly Plus account')).toBeNull();
    expect(screen.queryByText('Account')).toBeNull();
  });

  test('shows provider-neutral account management only after connection', async () => {
    mockedUseAccountSession.mockReturnValue(
      account({
        kind: 'signed-in',
        user: {
          id: 'account-1',
          email: 'matt@example.com',
          displayName: 'Matthew',
          provider: 'google',
        },
      }),
    );

    const screen = await render(<ProfileRoute />, { wrapper });

    expect(screen.getByText('Account')).toBeOnTheScreen();
    expect(screen.getByText('Google · matt@example.com')).toBeOnTheScreen();
  });

  test('shows one quiet active cue and profile-photo action for Plus', async () => {
    const selectAvatar = jest.fn();
    mockedUseAccountSession.mockReturnValue(
      account({
        kind: 'signed-in',
        user: {
          id: 'account-1',
          email: 'matt@example.com',
          displayName: 'Matthew',
          provider: 'apple',
        },
      }),
    );
    mockedUseProfileAvatar.mockReturnValue({
      uri: null,
      canUpload: true,
      plusActive: true,
      isBusy: false,
      error: null,
      errorKind: null,
      select: selectAvatar,
      remove: jest.fn(),
      retry: jest.fn(),
    });

    jest
      .spyOn(ActionSheetIOS, 'showActionSheetWithOptions')
      .mockImplementation((_options, callback) => callback(1));
    const screen = await render(<ProfileRoute />, { wrapper });

    expect(screen.getByText('Pilly Plus active')).toBeOnTheScreen();
    await fireEvent.press(screen.getByLabelText('Add profile photo'));
    expect(selectAvatar).toHaveBeenCalledWith('library');
    expect(screen.queryByText('Add photo')).toBeNull();
    expect(screen.queryByText('Private with Plus')).toBeNull();
  });

  test('offers removal from the avatar control when a photo exists', async () => {
    const removeAvatar = jest.fn();
    mockedUseAccountSession.mockReturnValue(
      account({
        kind: 'signed-in',
        user: {
          id: 'account-1',
          email: 'matt@example.com',
          displayName: 'Matthew',
          provider: 'apple',
        },
      }),
    );
    mockedUseProfileAvatar.mockReturnValue({
      uri: 'file:///profile.jpg',
      canUpload: true,
      plusActive: true,
      isBusy: false,
      error: null,
      errorKind: null,
      select: jest.fn(),
      remove: removeAvatar,
      retry: jest.fn(),
    });
    jest
      .spyOn(ActionSheetIOS, 'showActionSheetWithOptions')
      .mockImplementation((_options, callback) => callback(2));

    const screen = await render(<ProfileRoute />, { wrapper });
    await fireEvent.press(screen.getByLabelText('Change profile photo'));

    expect(removeAvatar).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Remove')).toBeNull();
  });
});
