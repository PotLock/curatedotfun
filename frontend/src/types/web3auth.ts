import { Web3Auth } from "@web3auth/modal";
import { IProvider } from "@web3auth/base";
import { Account, KeyPair } from "near-api-js";

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
  web3auth: Web3Auth | null;
  provider: IProvider | null;
  isInitialized: boolean;
  isLoggedIn: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getUserInfo(): Promise<Partial<AuthUserInfo>>;
  getNearAccount(): Promise<NearAccountInfo>;
}
