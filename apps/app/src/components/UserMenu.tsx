import { useState } from "react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

import { useNavigate } from "@tanstack/react-router";
import { ChevronDown, CircleUserRound, LogOut, Settings } from "lucide-react";
import { useAuth } from "../contexts/auth-context";
import { useNearSocialProfile } from "../hooks/near-social";
import { AvatarProfile } from "./AvatarProfile";

interface UserMenuProps {
  className?: string;
}

export default function UserMenu({ className }: UserMenuProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const {
    currentAccountId,
    handleSignIn,
    isSignedIn,
    handleSignOut,
    isAuthorized,
    handleAuthorize,
  } = useAuth();
  const { data: userProfile } = useNearSocialProfile(currentAccountId || "");

  const ProfileImage = ({ size = "small" }: { size?: "small" | "medium" }) => {
    return (
      <CircleUserRound className={size === "small" ? "h-7 w-7" : "h-6 w-6"} />
    );
  };

  const getUserDisplayName = () => {
    if (userProfile?.name) {
      return userProfile.name;
    }
    if (currentAccountId) {
      return currentAccountId;
    }
    return "User";
  };

  if (!isSignedIn) {
    return (
      <Button className={className || "hidden md:flex"} onClick={handleSignIn}>
        Login
      </Button>
    );
  }

  if (!isAuthorized) {
    return (
      <Button
        className={className || "hidden md:flex"}
        onClick={handleAuthorize}
      >
        Authorize App
      </Button>
    );
  }

  return (
    <DropdownMenu onOpenChange={setDropdownOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={className || "hidden md:flex"}>
          <div className="flex gap-1 items-center justify-center">
            {currentAccountId ? (
              <AvatarProfile accountId={currentAccountId} size="small" />
            ) : (
              <ProfileImage size="small" />
            )}
            <p className="text-sm font-medium leading-6">
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
          <div className="flex gap-2 w-full items-center">
            {currentAccountId ? (
              <AvatarProfile accountId={currentAccountId} size="medium" />
            ) : (
              <ProfileImage />
            )}
            <div>
              <p className="text-sm font-semibold leading-5">
                {currentAccountId}
              </p>
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
          className="cursor-pointer hover:bg-gray-100"
          onClick={() => {
            navigate({ to: "/profile/settings" });
          }}
        >
          <Settings />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleSignOut}
          className="cursor-pointer hover:bg-gray-100"
        >
          <LogOut />
          <span>Disconnect</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
