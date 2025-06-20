import { createFileRoute } from "@tanstack/react-router";
import { Container } from "../../../components/Container";
import { ProfileHeader } from "../../../components/profile/ProfileHeader";
import { ProfileTabs } from "../../../components/profile/ProfileTabs";
import { Button } from "../../../components/ui/button";
import { useAuth } from "../../../contexts/auth-context";

export const Route = createFileRoute("/_layout/profile/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { isSignedIn, currentAccountId, handleSignIn } = useAuth();

  return (
    <main className="mx-auto w-full px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-6 lg:px-8 lg:py-8 xl:px-12 lg:max-w-6xl xl:max-w-7xl">
      {isSignedIn && currentAccountId ? (
        <Container>
          <div className="flex flex-col gap-3 sm:gap-4 md:gap-6 lg:gap-8">
            <ProfileHeader accountId={currentAccountId} />
            <ProfileTabs />
          </div>
        </Container>
      ) : (
        <div className="min-h-screen mx-auto max-w-[1440px] flex flex-col gap-4 items-center justify-center">
          <h1>Please Login to Continue</h1>
          <Button onClick={handleSignIn}>Login</Button>
        </div>
      )}
    </main>
  );
}
