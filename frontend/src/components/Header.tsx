import { FaTwitter, FaBook, FaGithub, FaTelegram } from "react-icons/fa";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Modal } from "./Modal";
import { HowItWorks } from "./HowItWorks";

const Header = () => {
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  return (
    <>
      <header className="sticky top-0 flex justify-between items-center p-4 border-b-2 border-black bg-white z-10">
        <div className="flex flex-wrap items-center gap-4 sm:gap-8">
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
              <h1 className="text-2xl h-8">curate.fun</h1>
            </div>
          </Link>
          <button
            onClick={() => setShowHowItWorks(true)}
            className="text-gray-600 hover:text-black transition-colors"
          >
            How It Works
          </button>
          <Link
            to="/leaderboard"
            className="text-gray-600 hover:text-black transition-colors"
          >
            Leaderboard
          </Link>
          {process.env.NODE_ENV === "development" && (
            <Link
              to="/test"
              className="text-gray-600 hover:text-black transition-colors"
            >
              Test Panel
            </Link>
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
