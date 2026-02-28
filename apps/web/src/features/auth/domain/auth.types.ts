export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
};

export type AuthSuccessResponse = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

export type RefreshResponse = {
  accessToken: string;
  refreshToken: string;
};

export type AuthCredentials = {
  email: string;
  password: string;
};

export type RegisterInput = AuthCredentials & {
  name?: string;
};
