import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useAuthStore } from "../store/auth-store";
import { HowItWorks } from "./HowItWorks";
import { Modal } from "./Modal";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

import { useWalletSelector } from "@near-wallet-selector/react-hook";
import { useNavigate } from "@tanstack/react-router";
import {
  ChevronDown,
  CircleUserRound,
  CreditCard,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import * as nearApi from "near-api-js";
import { createAccessTokenPayload } from "../hooks/near-method";
import { AvatarProfile } from "./AvatarProfile";
import UserMenu from "./UserMenu";

const Header = () => {
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const navigate = useNavigate();

  const { showLoginModal } = useAuthStore();

  const { isLoading, isLoggedIn, logout, user } = useAuth();
  const isInitialized = !isLoading;

  const { signedAccountId, walletSelector } = useWalletSelector();

  useEffect(() => {
    const getToken = async () => {
      if (signedAccountId && walletSelector) {
        try {
          const keyStore = new nearApi.keyStores.BrowserLocalStorageKeyStore();
          const { publicKeyBytes, token, signatureBytes, tokenHash } =
            await createAccessTokenPayload(keyStore, signedAccountId);
          const publicKey = publicKeyBytes.toString();
          console.log("data", {
            publicKey,
            signedAccountId,
            token,
            signatureBytes,
            tokenHash,
          });
        } catch (error) {
          console.error("Failed to create access token or profile:", error);
        }
      }
    };

    getToken();
  }, [signedAccountId, walletSelector]);

  // Profile image component with error handling
  const ProfileImage = ({ size = "small" }) => {
    const handleImageError = () => {
      setImageError(true);
    };

    if (imageError || !user?.profileImage) {
      return (
        <CircleUserRound className={size === "small" ? "h-7 w-7" : "h-6 w-6"} />
      );
    }

    return (
      <img
        className="rounded-full"
        style={{
          height: size === "small" ? "28px" : "24px",
          width: size === "small" ? "28px" : "24px",
          objectFit: "cover",
        }}
        alt="Profile Image"
        src={user.profileImage}
        onError={handleImageError}
        loading="eager"
        referrerPolicy="no-referrer"
      />
    );
  };

  const getUserDisplayName = () => {
    if (signedAccountId) {
      return signedAccountId;
    }
    return user?.username || user?.email || "User";
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <>
      <header className="sticky top-0 flex justify-between items-center px-4 sm:px-6 md:px-[70px] py-3 border-b-2 border-neutral-300 bg-white z-10">
        <div className="flex items-center gap-4 md:gap-16 flex-shrink-0">
          <Link
            to="/"
            className="flex items-center hover:opacity-80 transition-opacity"
          >
            <img
              src="/curatedotfuntransparenticon.png"
              alt="curate.fun Logo"
              className="h-8 w-8 mr-2"
            />
            <div className="flex">
              <h1 className="text-xl md:text-2xl h-8">curate.fun</h1>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex gap-3 flex-shrink-0">
            {/* <Link to="/explore">
              <Button variant={"ghost"}>Feeds</Button>
            </Link> */}

            <Link
              to="/leaderboard"
              search={{ feed: "all feeds", timeframe: "all" }}
            >
              <Button variant={"ghost"}>Leaderboard</Button>
            </Link>
            <Link
              to="/create/feed"
              search={{ feed: "all feeds", timeframe: "all" }}
            >
              <Button variant={"ghost"}>Create</Button>
            </Link>
          </div>
        </div>{" "}
        <div className="flex items-center gap-2">
          <UserMenu />

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-8 w-8"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-10 w-10" />
            )}
          </Button>
        </div>
      </header>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-0 left-0 z-50 bg-white flex flex-col">
          <div className="sticky top-0 flex justify-between items-center px-4 py-3 border-b-2 border-neutral-300">
            <Link
              to="/"
              className="flex items-center hover:opacity-80 transition-opacity"
              onClick={() => setMobileMenuOpen(false)}
            >
              <img
                src="/curatedotfuntransparenticon.png"
                alt="curate.fun Logo"
                className="h-8 w-8 mr-2"
              />
              <div className="flex">
                <h1 className="text-xl h-8">curate.fun</h1>
              </div>
            </Link>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setMobileMenuOpen(false)}
            >
              <X className="h-6 w-6" />
            </Button>
          </div>

          <div className="flex flex-col items-center justify-between h-full gap-4 p-4 mb-6">
            <div className="flex flex-col gap-4 p-4 mt-4">
              {/* <Link
                to="/explore"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full"
              >
                <Button
                  variant="ghost"
                  className="w-full justify-center text-lg py-4"
                >
                  Feeds
                </Button>
              </Link> */}
              <Link
                to="/leaderboard"
                search={{ feed: "all feeds", timeframe: "all" }}
                onClick={() => setMobileMenuOpen(false)}
                className="w-full"
              >
                <Button
                  variant="ghost"
                  className="w-full justify-center text-lg py-4"
                >
                  Leaderboard
                </Button>
              </Link>
              <Link
                to="/create/feed"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full"
              >
                <Button
                  variant="ghost"
                  className="w-full justify-center text-lg py-4"
                >
                  Create
                </Button>
              </Link>
            </div>

            <div className="w-full flex justify-center mt-4">
              {isInitialized && (isLoggedIn || signedAccountId) ? (
                <DropdownMenu onOpenChange={setDropdownOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex w-full md:hidden">
                      <div className="flex gap-1 items-center justify-center">
                        {signedAccountId ? (
                          <AvatarProfile
                            accountId={signedAccountId}
                            size="small"
                          />
                        ) : (
                          <ProfileImage size="small" />
                        )}
                        <p className="text-sm font-medium leading-6 sm:block">
                          {getUserDisplayName()}
                        </p>
                        <ChevronDown
                          className={`h-4 w-4 transition-transform duration-200 ${
                            dropdownOpen ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 mt-4">
                    <DropdownMenuItem>
                      <div className="flex gap-2 w-full items-start">
                        {signedAccountId ? (
                          <AvatarProfile
                            accountId={signedAccountId}
                            size="medium"
                          />
                        ) : (
                          <ProfileImage />
                        )}
                        <div>
                          <p className="text-sm font-semibold leading-5">
                            {signedAccountId || user?.username || user?.email}
                          </p>
                          {!signedAccountId && user?.email && (
                            <p className="text-xs leading-5 text-gray-500">
                              {user.email}
                            </p>
                          )}
                        </div>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="cursor-pointer hover:bg-gray-100"
                      onClick={() => {
                        navigate({ to: "/profile" });
                      }}
                    >
                      <CircleUserRound />
                      <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <CreditCard />
                      <span>Wallet</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="cursor-pointer hover:bg-gray-100"
                    >
                      <LogOut />
                      <span>Disconnect</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button onClick={showLoginModal}>Login</Button>
              )}
            </div>
          </div>
        </div>
      )}
      <Modal isOpen={showHowItWorks} onClose={() => setShowHowItWorks(false)}>
        <HowItWorks />
      </Modal>
    </>
  );
};

export default Header;
