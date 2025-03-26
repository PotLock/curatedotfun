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
import { ProfileOverview } from "./overview";

export function ProfileTabs() {
  return (
    <Tabs defaultValue="overview" className="w-full space-y-[30px]">
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
      <TabsContent value="overview">
        <ProfileOverview />
      </TabsContent>
      <TabsContent value="content">
        <p>Content</p>
      </TabsContent>
      <TabsContent value="my-feeds">
        <p>My Feeds</p>
      </TabsContent>
      <TabsContent value="points">
        <p>Points</p>
      </TabsContent>
      <TabsContent value="activity">
        <p>Activity</p>
      </TabsContent>
    </Tabs>
  );
}
