import type { UserProfile as Web3AuthUserProfile } from './web3auth';

export type AuthMethod = 'web3auth' | 'near_wallet' | null;

export type AuthUser = Web3AuthUserProfile;

export interface AuthContextType {
  isLoggedIn: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  idToken: string | null; // JWT for API authentication
  authMethod: AuthMethod;
  login: (
    method: 'web3auth' | 'near_wallet',
    options?: { loginProvider?: string; [key: string]: unknown },
  ) => Promise<void>;
  logout: () => Promise<void>;
}
