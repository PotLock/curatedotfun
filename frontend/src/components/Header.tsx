import { FaTwitter, FaBook, FaGithub, FaTelegram } from "react-icons/fa";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Modal } from "./Modal";
import { HowItWorks } from "./HowItWorks";
import { useWeb3Auth } from "../hooks/use-web3-auth";

const Header = () => {
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  const { isInitialized, isLoggedIn, login, logout } = useWeb3Auth();

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
            <Link to="/">
              <Button variant={"ghost"}>Leaderboard</Button>
            </Link>
            <Link to="/test">
              <Button variant={"ghost"}>Submit Content</Button>
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* User Dropdown */}
          <DropdownMenu onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="hidden md:flex">
                <div className="flex gap-1 items-center justify-center">
                  <AvatarDemo />
                  <p className="text-sm font-medium leading-6 hidden sm:block">
                    7dc12........976f
                  </p>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      dropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuItem>
                <span>Log out</span>
                <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

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
              <DropdownMenu onOpenChange={setDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex w-full max-w-xs">
                    <div className="flex gap-1 items-center justify-center">
                      <AvatarDemo />
                      <p className="text-sm font-medium leading-6">
                        7dc12........976f
                      </p>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform duration-200 ${
                          dropdownOpen ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  <DropdownMenuItem>
                    <span>Log out</span>
                    <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

      )}

        <div>
          {isInitialized ? (
            isLoggedIn ? (
              <button
                onClick={logout}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-1 rounded"
              >
                Logout
              </button>
            ) : (
              <button
                onClick={login}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-1 rounded"
              >
                Login
              </button>
            )
          ) : (
            <p>Loading...</p>
          )}
        </div>
        <nav className="flex space-x-4 mx-4">
          <a
            href="https://twitter.com/curatedotfun"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xl hover:text-blue-500"
          >
            <FaTwitter />
          </a>
          <a
            href="https://docs.curate.fun"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xl hover:text-blue-500"
          >
            <FaBook />
          </a>
          <a
            href="https://github.com/potlock/curatedotfun"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xl hover:text-blue-500"
          >
            <FaGithub />
          </a>
          <a
            href="https://t.me/+UM70lvMnofk3YTVh"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xl hover:text-blue-500"
          >
            <FaTelegram />
          </a>
        </nav>
      </header>

      <Modal isOpen={showHowItWorks} onClose={() => setShowHowItWorks(false)}>
        <HowItWorks />
      </Modal>
    </>
  );
};

export default Header;
