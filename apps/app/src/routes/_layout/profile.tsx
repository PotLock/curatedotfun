import { Outlet, createFileRoute } from "@tanstack/react-router";
import { Container } from "../../components/Container";
import { ProfileHeader } from "../../components/profile/ProfileHeader";
import { useAuth } from "../../contexts/auth-context";
import { Button } from "../../components/ui/button";

export const Route = createFileRoute("/_layout/profile")({
  component: ProfileLayout,
});

function ProfileLayout() {
  const { isSignedIn, currentAccountId, handleSignIn } = useAuth();

  if (!isSignedIn || !currentAccountId) {
    return (
      <main className="mx-auto w-full px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-6 lg:px-8 lg:py-8 xl:px-12 lg:max-w-6xl xl:max-w-7xl">
        <div className="min-h-screen mx-auto max-w-[1440px] flex flex-col gap-4 items-center justify-center">
          <h1>Please Login to Continue</h1>
          <Button onClick={handleSignIn}>Login</Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-6 lg:px-8 lg:py-8 xl:px-12 lg:max-w-6xl xl:max-w-7xl">
      <Container>
        <div className="flex flex-col gap-3 sm:gap-4 md:gap-6 lg:gap-8">
          <ProfileHeader accountId={currentAccountId} />
          <Outlet />
        </div>
      </Container>
    </main>
  );
}
