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
export default function UserMenu() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userInfo, setUserInfo] = useState<Partial<AuthUserInfo>>();

  const { isInitialized, isLoggedIn, login, logout, getUserInfo } =
    useWeb3Auth();

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const info = await getUserInfo();
        setUserInfo(info);
        console.log("User Info:", info);
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
  return (
    <>
      {isInitialized && isLoggedIn && userInfo ? (
        <DropdownMenu onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="hidden md:flex">
              <div className="flex gap-1 items-center justify-center">
                <img
                  className="rounded-full h-7 w-7"
                  alt="Profile Image"
                  src={userInfo.profileImage}
                />
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
                <img
                  src={userInfo.profileImage}
                  alt="Profile Image"
                  height={24}
                  width={24}
                  className="rounded-full"
                />
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
            <DropdownMenuItem onClick={logout}>
              <CircleUserRound />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={logout}>
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
        <Button className="hidden md:flex" onClick={login}>
          Login
        </Button>
      )}
    </>
  );
}
