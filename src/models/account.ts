export type AccountUser = {
  id: string;
  email: string;
  displayName: string;
};

export type AccountSession = {
  user: AccountUser;
  accessToken: string;
  idToken?: string;
  refreshToken: string;
  expiresAt: number;
};
