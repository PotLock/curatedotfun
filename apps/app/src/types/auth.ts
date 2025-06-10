import { UserProfile } from "../lib/validation/user";
import { IProvider } from "@web3auth/base";
import { Web3AuthNoModal } from "@web3auth/no-modal";
import { KeyPair } from "near-api-js";

export type AuthMethod = "web3auth" | "near" | null;

export interface NearAccountDetails {
  accountId: string;
  publicKey: string; // We'll ensure this is always populated if logged in
}

export type { UserProfile } from "../lib/validation/user";

export interface AuthContextType {
  // Core State
  authMethod: AuthMethod;
  isLoggedIn: boolean;
  isLoading: boolean;
  userProfile: UserProfile | null;
  nearAccountDetails: NearAccountDetails | null;
  error: Error | null;

  web3AuthInstance: Web3AuthNoModal | null;
  web3AuthProvider: IProvider | null;

  login: (
    method: "web3auth" | "near",
    web3AuthOptions?: {
      loginProvider?: string;
      extraLoginOptions?: unknown;
    },
  ) => Promise<void>;
  logout: () => Promise<void>;
  getIdToken: (purposeMessage?: string) => Promise<string | null>;
  fetchUserProfile: () => Promise<UserProfile | null>;

  // Potentially a direct way to get Web3Auth specific credentials if still needed by CreateAccountModal
  getWeb3AuthNearCredentials: () => Promise<{
    keyPair: KeyPair;
    publicKey: string;
  } | null>;
}
