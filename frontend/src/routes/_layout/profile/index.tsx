import { createFileRoute } from "@tanstack/react-router";
import { ProfileHeader } from "../../../components/profile/ProfileHeader";
import { ProfileTabs } from "../../../components/profile/ProfileTabs";
import { Button } from "../../../components/ui/button";
import { useWeb3Auth } from "../../../hooks/use-web3-auth";
import { useCurrentUserProfile } from "../../../lib/api";
import { useAuthStore } from "../../../store/auth-store";
import { useEffect } from "react";

export const Route = createFileRoute("/_layout/profile/")({
  component: RouteComponent,
  beforeLoad: () => {
    // This will run before the route loads
    const authStore = useAuthStore.getState();
    if (authStore && authStore.showLoginModal) {
      // Schedule the modal to open after a tiny delay to ensure routing is complete
      setTimeout(() => authStore.showLoginModal(), 10);
    }
  },
});

function RouteComponent() {
  const { isInitialized, isLoggedIn, login, web3auth } = useWeb3Auth();
  const { showLoginModal } = useAuthStore();

  const {
    data: userProfile,
    isLoading,
    error,
  } = useCurrentUserProfile(isLoggedIn && !!web3auth);

  const isLoaded = !isLoading && userProfile;
  const hasError = !!error;
  useEffect(() => {
    const timer1 = setTimeout(() => {
      if (!isLoggedIn) {
        showLoginModal();
      }
    }, 100);

    return () => {
      clearTimeout(timer1);
    };
  }, [isInitialized, isLoggedIn, showLoginModal]);

  if (hasError) {
    console.error("Error fetching user profile:", error);
  }

  return (
    <div className="bg-white">
      <main className="mx-auto w-full px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-6 lg:px-8 lg:py-8 xl:px-12 lg:max-w-6xl xl:max-w-7xl">
        {isInitialized && isLoggedIn && isLoaded ? (
          <div className="flex flex-col gap-3 sm:gap-4 md:gap-6 lg:gap-8">
            <ProfileHeader />
            <ProfileTabs />
          </div>
        ) : (
          <div className="min-h-screen mx-auto max-w-[1440px] flex flex-col gap-4 items-center justify-center">
            <h1>Please Login to Continue</h1>
            <Button onClick={showLoginModal}>Login</Button>
          </div>
        )}
      </main>
    </div>
  );
}
