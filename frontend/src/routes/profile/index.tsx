import { createFileRoute } from "@tanstack/react-router";
import Header from "../../components/Header";
import { ProfileHeader } from "../../components/profile/ProfileHeader";
import { ProfileTabs } from "../../components/profile/ProfileTabs";
import { useWeb3Auth } from "../../hooks/use-web3-auth";
import { useEffect, useState } from "react";
import { AuthUserInfo } from "../../types/web3auth";
import { Button } from "../../components/ui/button";

export const Route = createFileRoute("/profile/")({
  component: RouteComponent,
});

function RouteComponent() {
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
    <div className="min-h-screen bg-white">
      <Header />
      <main className="mx-auto w-full px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-6 lg:px-8 lg:py-8 xl:px-12 lg:max-w-6xl xl:max-w-7xl">
        {isInitialized && isLoggedIn && userInfo ? (
          <div className="flex flex-col gap-3 sm:gap-4 md:gap-6 lg:gap-8">
            <ProfileHeader />
            <ProfileTabs />
          </div>
        ) : (
          <div className="min-h-screen mx-auto max-w-[1440px] flex flex-col gap-4 items-center justify-center">
            <h1>Please Login to Continue</h1>
            <Button onClick={login}>Login</Button>
          </div>
        )}
      </main>
    </div>
  );
}
