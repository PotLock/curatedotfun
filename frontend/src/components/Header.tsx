import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "./ui/button";

import { Menu, X } from "lucide-react";
import UserMenu from "./UserMenu";

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
              <UserMenu className="flex w-full" />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
