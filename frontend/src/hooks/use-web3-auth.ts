import { createContext, useContext } from "react";
import { Web3AuthContextType } from "../types/web3auth";

export const Web3AuthContext = createContext<Web3AuthContextType | null>(null);

export const useWeb3Auth = (): Web3AuthContextType => {
  const context = useContext(Web3AuthContext);
  if (!context) {
    throw new Error("useWeb3Auth must be used within a Web3AuthProvider");
  }
  return context;
};
