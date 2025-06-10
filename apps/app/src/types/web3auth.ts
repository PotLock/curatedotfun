import { Web3AuthNoModal } from "@web3auth/no-modal";
import { IProvider } from "@web3auth/base";
import { Account, KeyPair } from "near-api-js";
import { Dispatch, SetStateAction } from "react"; // Import Dispatch and SetStateAction
import { UserProfile } from "../lib/validation/user";

export interface Web3AuthModalState {
  type: "create-account";
  isOpen: boolean;
  onClose: () => void;
}

export type AuthUserInfo = {
  email?: string;
  name?: string;
  profileImage?: string;
  aggregateVerifier?: string;
  verifier: string;
  verifierId: string;
  dappShare?: string;
  /**
   * Token issued by Web3Auth.
   */
  idToken?: string;
  /**
   * Token issued by OAuth provider. Will be available only if you are using
   * custom verifiers.
   */
  oAuthIdToken?: string;
  /**
   * Access Token issued by OAuth provider. Will be available only if you are using
   * custom verifiers.
   */
  oAuthAccessToken?: string;
  appState?: string;
  touchIDPreference?: string;
  isMfaEnabled?: boolean;
};

export interface NearAccountInfo {
  account: Account;
  accountId: string;
  keyPair: KeyPair;
}

export interface Web3AuthContextType {
  web3auth: Web3AuthNoModal | null;
  provider: IProvider | null;
  isInitialized: boolean;
  isLoggedIn: boolean;
  login: (
    loginProvider?: string,
    extraLoginOptions?: unknown,
  ) => Promise<{
    provider: IProvider | null;
    credentials?: { keyPair: KeyPair; publicKey: string };
    error?: unknown;
  }>;
  logout: () => Promise<void>;
  getUserInfo(): Promise<Partial<AuthUserInfo>>;
  getNearAccount(): Promise<NearAccountInfo>;
  getNearCredentials(
    web3authProvider: IProvider | null,
  ): Promise<{ keyPair: KeyPair; publicKey: string }>;
  currentUserProfile: UserProfile | null;
  nearPublicKey: string | null;
  isLoadingProfile: boolean;
  setCurrentUserProfile: Dispatch<SetStateAction<UserProfile | null>>;
}
