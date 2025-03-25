import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import { HowItWorks } from "./HowItWorks";
import { useWeb3Auth } from "../hooks/use-web3-auth";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

import {
  ChevronDown,
  CircleUserRound,
  CreditCard,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { AuthUserInfo } from "../types/web3auth";
import UserMenu from "./UserMenu";

const Header = () => {
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
      <header className="sticky top-0 flex justify-between items-center px-4 sm:px-6 md:px-[70px] py-3 border-b-2 border-[#D4d4d4] bg-white z-10">
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
            <Link to="/explore">
              <Button variant={"ghost"}>Feeds</Button>
            </Link>

            <Link to="/leaderboard">
              <Button variant={"ghost"}>Leaderboard</Button>
            </Link>
            <Link to="/test">
              <Button variant={"ghost"}>Submit Content</Button>
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
      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-0 left-0 z-50 bg-white flex flex-col">
          <div className="sticky top-0 flex justify-between items-center px-4 py-3 border-b-2 border-[#D4d4d4]">
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
              <Link
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
              </Link>
              <Link
                to="/"
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
                to="/test"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full"
              >
                <Button
                  variant="ghost"
                  className="w-full justify-center text-lg py-4"
                >
                  Submit Content
                </Button>
              </Link>
            </div>

            <div className="w-full flex justify-center mt-4">
              {isInitialized && isLoggedIn && userInfo ? (
                <DropdownMenu onOpenChange={setDropdownOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex w-full md:hidden">
                      <div className="flex gap-1 items-center justify-center">
                        <img
                          className="rounded-full h-7 w-7"
                          alt="Profile Image"
                          src={userInfo.profileImage}
                        />
                        <p className="text-sm font-medium leading-6 sm:block">
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
                <Button onClick={login}>Login</Button>
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
