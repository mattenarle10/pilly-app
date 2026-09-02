export type AccountProvider = 'apple' | 'google';

export function accountProviderLabel(provider: AccountProvider): 'Apple' | 'Google' {
  return provider === 'apple' ? 'Apple' : 'Google';
}

export type AccountUser = {
  id: string;
  email: string;
  displayName: string;
  provider: AccountProvider;
};

export type AccountSession = {
  user: AccountUser;
  accessToken: string;
  idToken?: string;
  refreshToken: string;
  expiresAt: number;
};
