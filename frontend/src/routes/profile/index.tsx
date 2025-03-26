import { createFileRoute } from "@tanstack/react-router";
import Header from "../../components/Header";
import { ProfileHeader } from "../../components/profile/ProfileHeader";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import {
  Activity,
  Award,
  Newspaper,
  NotepadTextDashed,
  ScanSearch,
} from "lucide-react";

export const Route = createFileRoute("/profile/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="py-6 px-6 md:py-12 w-full md:px-16 flex items-center flex-col gap-[26px]">
        <ProfileHeader />

        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">
              <ScanSearch strokeWidth={1} size={24} />
              Overview
            </TabsTrigger>
            <TabsTrigger value="content">
              <NotepadTextDashed strokeWidth={1} size={24} />
              Content
            </TabsTrigger>
            <TabsTrigger value="my-feeds">
              <Newspaper strokeWidth={1} size={24} />
              My Feeds
            </TabsTrigger>
            <TabsTrigger value="points">
              <Award strokeWidth={1} size={24} />
              Points
            </TabsTrigger>
            <TabsTrigger value="activity">
              <Activity strokeWidth={1} size={24} />
              Activity
            </TabsTrigger>
          </TabsList>
          <TabsContent value="account">
            Make changes to your account here.
          </TabsContent>
          <TabsContent value="password">Change your password here.</TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
