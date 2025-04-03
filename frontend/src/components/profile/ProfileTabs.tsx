import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/profile-tabs";
import {
  Activity,
  Award,
  Newspaper,
  NotepadTextDashed,
  ScanSearch,
} from "lucide-react";
import { ProfileOverview } from "./overview";
import { ProfileContent } from "./content";
import { MyFeeds } from "./my-feeds";

// Tab data structure
const TABS = [
  {
    value: "overview",
    label: "Overview",
    icon: ScanSearch,
    component: ProfileOverview,
  },
  {
    value: "content",
    label: "Content",
    icon: NotepadTextDashed,
    component: ProfileContent,
  },
  {
    value: "my-feeds",
    label: "My Feeds",
    icon: Newspaper,
    component: MyFeeds,
  },
  {
    value: "points",
    label: "Points",
    icon: Award,
    component: () => <p>Points</p>,
  },
  {
    value: "activity",
    label: "Activity",
    icon: Activity,
    component: () => <p>Activity</p>,
  },
];

export function ProfileTabs() {
  return (
    <>
      <Tabs defaultValue={"overview"} className="w-full space-y-[30px]">
        <TabsList className="overflow-x-auto">
          {TABS.map(({ value, label, icon: Icon }) => (
            <TabsTrigger key={value} value={value}>
              <Icon strokeWidth={1} size={24} />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map(({ value, component: Component }) => (
          <TabsContent key={value} value={value} className="w-full">
            <Component />
          </TabsContent>
        ))}
      </Tabs>
    </>
  );
}
