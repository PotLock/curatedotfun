import { createFileRoute } from "@tanstack/react-router";
import { ProfileHeader } from "../../../components/profile/ProfileHeader";
import { ProfileTabs } from "../../../components/profile/ProfileTabs";
import { Button } from "../../../components/ui/button";
import { useCurrentUserProfile } from "../../../lib/api";
import { useAuthStore } from "../../../store/auth-store";
import { Container } from "../../../components/Container";
import { useAuth } from "../../../contexts/AuthContext";

export const Route = createFileRoute("/_layout/profile/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { isLoggedIn } = useAuth();
  const { showLoginModal } = useAuthStore();

  const {
    data: userProfile,
    isLoading,
    error,
  } = useCurrentUserProfile(isLoggedIn);

  const isLoaded = !isLoading && userProfile;
  const hasError = !!error;

  if (hasError) {
    console.error("Error fetching user profile:", error);
  }

  return (
    <main className="mx-auto w-full px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-6 lg:px-8 lg:py-8 xl:px-12 lg:max-w-6xl xl:max-w-7xl">
      {isLoggedIn ? (
        <Container>
          <div className="flex flex-col gap-3 sm:gap-4 md:gap-6 lg:gap-8">
            <ProfileHeader />
            <ProfileTabs />
          </div>
        </Container>
      ) : (
        <div className="min-h-screen mx-auto max-w-[1440px] flex flex-col gap-4 items-center justify-center">
          <h1>Please Login to Continue</h1>
          <Button onClick={showLoginModal}>Login</Button>
        </div>
      )}
    </main>
  );
}
