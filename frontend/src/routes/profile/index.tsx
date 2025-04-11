import { createFileRoute } from "@tanstack/react-router";
import Header from "../../components/Header";
import { ProfileHeader } from "../../components/profile/ProfileHeader";
import { ProfileTabs } from "../../components/profile/ProfileTabs";

export const Route = createFileRoute("/profile/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="mx-auto w-full px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-6 lg:px-8 lg:py-8 xl:px-12 lg:max-w-6xl xl:max-w-7xl">
        <div className="flex flex-col gap-3 sm:gap-4 md:gap-6 lg:gap-8">
          <ProfileHeader />
          <ProfileTabs />
        </div>
      </main>
    </div>
  );
}
