import { createFileRoute } from "@tanstack/react-router";
import Header from "../../components/Header";
import { ProfileHeader } from "../../components/profile/ProfileHeader";
import { ProfileTabs } from "../../components/profile/ProfileTabs";

export const Route = createFileRoute("/profile/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="py-6 px-6 md:py-12 w-full md:px-16 flex items-center flex-col gap-[26px]">
        <ProfileHeader />
        <ProfileTabs />
      </main>
    </div>
  );
}
