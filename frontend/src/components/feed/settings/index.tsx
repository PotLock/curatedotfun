import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../ui/profile-tabs";
import ConnectedAccounts from "./connected";
import GeneralSettings from "./general";

const TABS = [
  {
    value: "general",
    label: "General",
    component: GeneralSettings,
  },
  {
    value: "connected",
    label: "Connected Accounts",
    component: ConnectedAccounts,
  },
];
export default function FeedSettings() {
  return (
    <div>
      <Tabs
        defaultValue={"general"}
        className="w-full space-y-[30px] border-none"
      >
        <TabsList className="overflow-x-auto border-none flex gap-3">
          {TABS.map(({ value, label }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="bg-[#F3F4F6] border-1 border border-neutral-300 active:bg-black rounded-md"
            >
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
    </div>
  );
}
