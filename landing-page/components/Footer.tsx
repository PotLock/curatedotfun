import Image from "next/image";
import Link from "next/link";
import { FaBook, FaGithub, FaTelegram, FaTwitter } from "react-icons/fa";

const Footer = () => {
  return (
    <footer className="w-full py-8 bg-[#F9F9F9] border-t border-black flex flex-col sm:flex-row justify-between items-center px-6 gap-6">
      <div className="flex items-center">
        <Image
          src="/curatedotfuntransparenticon.png"
          alt="curate.fun Logo"
          width={32}
          height={32}
          className="h-8 w-8 mr-2"
          priority
        />
        <h1 className="text-2xl font-bold">curate.fun</h1>
      </div>
      <div className="text-sm sm:text-base text-right mt-2 sm:mt-0">
        <Link
          href="https://potlock.org"
          className="hover:text-gray-800"
          target="_blank"
          rel="noopener noreferrer"
        >
          Curated with ❤️ by 🫕 POTLOCK
        </Link>
      </div>
      <div className="flex space-x-6">
        <Link
          href="https://twitter.com/curatedotfun"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xl hover:text-blue-500"
        >
          <FaTwitter />
        </Link>
        <Link
          href="https://docs.curate.fun"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xl hover:text-blue-500"
        >
          <FaBook />
        </Link>
        <Link
          href="https://github.com/potlock/curatedotfun"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xl hover:text-blue-500"
        >
          <FaGithub />
        </Link>
        <Link
          href="https://t.me/+UM70lvMnofk3YTVh"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xl hover:text-blue-500"
        >
          <FaTelegram />
        </Link>
      </div>
    </footer>
  );
};

export default Footer;
