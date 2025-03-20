import { Web3Auth } from "@web3auth/modal";
import { IProvider } from "@web3auth/base";

export interface Web3AuthContextType {
  web3auth: Web3Auth | null;
  provider: IProvider | null;
  isInitialized: boolean;
  isLoggedIn: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}
