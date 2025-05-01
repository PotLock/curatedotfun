import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/profile-tabs";
import {
  Award,
  Coins,
  ListFilter,
  Newspaper,
  Settings2,
  UsersRound,
  Vote,
} from "lucide-react";
import FeedContent from "./content";
import FeedCuration from "./curation";
import FeedProposals from "./proposals";
import FeedToken from "./token";
import FeedPoints from "./points";
import FeedMembers from "./members";
import FeedSettings from "./settings";

// Tab data structure
const TABS = [
  {
    value: "content",
    label: "Content",
    icon: Newspaper,
    component: FeedContent,
  },
  {
    value: "curation",
    label: "Curation",
    icon: ListFilter,
    component: FeedCuration,
  },
  {
    value: "proposals",
    label: "Proposals",
    icon: Vote,
    component: FeedProposals,
  },
  {
    value: "token",
    label: "Token",
    icon: Coins,
    component: FeedToken,
  },
  {
    value: "points",
    label: "Points",
    icon: Award,
    component: FeedPoints,
  },
  {
    value: "members",
    label: "Members",
    icon: UsersRound,
    component: FeedMembers,
  },
  {
    value: "settings",
    label: "Settings",
    icon: Settings2,
    component: FeedSettings,
  },
];

export function FeedTabs() {
  return (
    <>
      <Tabs
        defaultValue={"content"}
        className="w-full justify-between space-y-[30px]"
      >
        <TabsList className="overflow-x-auto w-full justify-between">
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
