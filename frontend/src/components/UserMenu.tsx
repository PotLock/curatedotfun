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

import { ChevronDown, CircleUserRound, CreditCard, LogOut } from "lucide-react";
import { AuthUserInfo } from "../types/web3auth";
import { useNavigate } from "@tanstack/react-router";
import { LoginModal } from "./LoginModal";

export default function UserMenu() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userInfo, setUserInfo] = useState<Partial<AuthUserInfo>>();
  const [imageError, setImageError] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const navigate = useNavigate();

  const { isInitialized, isLoggedIn, logout, getUserInfo } =
    useWeb3Auth();

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const info = await getUserInfo();
        setUserInfo(info);
        // Reset image error state when we get new user info
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
          objectFit: "cover", // Add this to ensure image fits properly
        }}
        alt="Profile Image"
        src={userInfo.profileImage}
        onError={handleImageError}
        loading="eager" // Make image loading priority high
        referrerPolicy="no-referrer" // Help with potential CORS issues
      />
    );
  };

  return (
    <>
      {isInitialized && isLoggedIn && userInfo ? (
        <DropdownMenu onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="hidden md:flex">
              <div className="flex gap-1 items-center justify-center">
                <ProfileImage size="small" />
                <p className="text-sm font-medium leading-6 hidden sm:block">
                  {(userInfo as { name?: string }).name ||
                    (userInfo as { email?: string }).email}
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
                <ProfileImage />
                <div>
                  <p className="text-sm font-semibold leading-5">
                    {(userInfo as { name?: string }).name}
                  </p>
                  <p className="text-xs leading-5 text-gray-500">
                    {(userInfo as { email?: string }).email}
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
            <DropdownMenuItem>
              <CreditCard />
              <span>Wallet</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={logout}
              className="cursor-pointer hover:bg-gray-100"
            >
              <LogOut />
              <span>Disconnect</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button className="hidden md:flex" onClick={() => setIsLoginModalOpen(true)}>
          Login
        </Button>
      )}

      <LoginModal 
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </>
  );
}
