import { useEffect, useState } from "react";
import { useWeb3Auth } from "../hooks/use-web3-auth";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

import { useNavigate } from "@tanstack/react-router";
import { ChevronDown, CircleUserRound, CreditCard, LogOut } from "lucide-react";
import { useAuthStore } from "../store/auth-store";
import { AuthUserInfo } from "../types/web3auth";
import { useWalletSelector } from "@near-wallet-selector/react-hook";
import { AvatarProfile } from "./AvatarProfile";

export default function UserMenu() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userInfo, setUserInfo] = useState<Partial<AuthUserInfo>>();
  const [imageError, setImageError] = useState(false);
  const navigate = useNavigate();
  const { showLoginModal } = useAuthStore();

  const { isInitialized, isLoggedIn, logout, getUserInfo } = useWeb3Auth();
  const { signedAccountId, signOut } = useWalletSelector();

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const info = await getUserInfo();
        setUserInfo(info);
        setImageError(false);
      } catch (error) {
        console.error("Error fetching user info:", error);
      }
    };

    if (isLoggedIn) {
      fetchUserInfo();
    } else {
      setUserInfo({});
    }
  }, [isLoggedIn, getUserInfo]);

  // Profile image component with error handling
  const ProfileImage = ({ size = "small" }) => {
    const handleImageError = () => {
      setImageError(true);
    };

    if (imageError || !userInfo?.profileImage) {
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
        src={userInfo.profileImage}
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
    return (
      (userInfo as { name?: string }).name ||
      (userInfo as { email?: string }).email
    );
  };

  const handleLogout = () => {
    if (signedAccountId) {
      signOut();
    } else {
      logout();
    }
  };

  return (
    <>
      {(isInitialized && isLoggedIn && userInfo) || signedAccountId ? (
        <DropdownMenu onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="hidden md:flex">
              <div className="flex gap-1 items-center justify-center">
                {signedAccountId ? (
                  <AvatarProfile accountId={signedAccountId} size="small" />
                ) : (
                  <ProfileImage size="small" />
                )}
                <p className="text-sm font-medium leading-6 hidden sm:block">
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
                  <AvatarProfile accountId={signedAccountId} size="medium" />
                ) : (
                  <ProfileImage />
                )}
                <div>
                  <p className="text-sm font-semibold leading-5">
                    {signedAccountId || (userInfo as { name?: string }).name}
                  </p>
                  {!signedAccountId && (
                    <p className="text-xs leading-5 text-gray-500">
                      {(userInfo as { email?: string }).email}
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
            {/* <DropdownMenuItem>
              <CreditCard />
              <span>Wallet</span>
            </DropdownMenuItem> */}
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
        <Button className="hidden md:flex" onClick={showLoginModal}>
          Login
        </Button>
      )}
    </>
  );
}
