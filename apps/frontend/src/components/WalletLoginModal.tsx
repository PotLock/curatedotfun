import { Button } from "./ui/button";
import { Modal } from "./Modal";
import { useWalletSelector } from "@near-wallet-selector/react-hook";

interface WalletLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WalletLoginModal = ({
  isOpen,
  onClose,
}: WalletLoginModalProps) => {
  const { signIn } = useWalletSelector();

  const handleWalletSelect = (chain: "near" | "solana" | "evm") => {
    if (chain === "near") {
      signIn();
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="mx-auto">
        <div>
          <h2 className="text-2xl font-bold">Connect Wallet</h2>
          <p className="text-gray-600">Select your preferred blockchain</p>
        </div>

        <div className="flex flex-col gap-4 py-4">
          <div className="space-y-4">
            {/* NEAR Wallet Button */}
            <Button
              className="w-full flex items-center justify-center gap-2"
              onClick={() => handleWalletSelect("near")}
              variant="secondary"
            >
              <img width={18} height={18} src="/images/near.png" alt="NEAR" />
              NEAR
            </Button>

            {/* Solana Wallet Button */}
            <Button
              className="w-full flex items-center justify-center gap-2"
              onClick={() => handleWalletSelect("solana")}
              variant="secondary"
              disabled
            >
              <img
                width={18}
                height={18}
                src="/images/solana.jpeg"
                alt="Solana"
              />
              Solana
              <span className="text-xs text-gray-500 ml-1">(Coming Soon)</span>
            </Button>

            {/* EVM Wallet Button */}
            <Button
              className="w-full flex items-center justify-center gap-2"
              onClick={() => handleWalletSelect("evm")}
              variant="secondary"
              disabled
            >
              <img
                width={18}
                height={18}
                src="/images/metamask.png"
                alt="metamask"
              />
              Metamask
              <span className="text-xs text-gray-500 ml-1">(Coming Soon)</span>
            </Button>
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default WalletLoginModal;
