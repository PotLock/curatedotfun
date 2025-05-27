import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

import { useNavigate } from "@tanstack/react-router";
import { ChevronDown, CircleUserRound, LogOut } from "lucide-react";
import { useAuthStore } from "../store/auth-store";
import { useWalletSelector } from "@near-wallet-selector/react-hook";
import { AvatarProfile } from "./AvatarProfile";

export default function UserMenu() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const navigate = useNavigate();
  const { showLoginModal } = useAuthStore();

  const { isLoading, isLoggedIn, logout, user } = useAuth();
  const isInitialized = !isLoading;

  const { signedAccountId, signOut } = useWalletSelector();

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
    if (signedAccountId && signOut) {
      await signOut();
    }
    await logout();
  };

  return (
    <>
      {isInitialized && (isLoggedIn || signedAccountId) ? (
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
