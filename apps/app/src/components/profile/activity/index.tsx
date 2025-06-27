import { ChevronsUpDown } from "lucide-react";
import { Button } from "../../ui/button";
import { Card, CardContent } from "../../ui/card";
import { PaginationControls } from "./PaginationControls";

// const transformActivityData = (activity: UserActivityStats): ActivityItem => {
//   const baseItem: ActivityItem = {
//     type: activity.type,
//     time: new Date(activity.timestamp).toLocaleTimeString([], {
//       hour: "2-digit",
//       minute: "2-digit",
//     }),
//     icon: FileText, // Default icon
//     content: {
//       title: activity.data?.title || "",
//       to: activity.data?.to || "",
//     },
//   };

//   // Map activity types to appropriate icons and content
//   switch (activity.type) {
//     case ActivityType.CONTENT_SUBMISSION:
//       return {
//         ...baseItem,
//         icon: FileText,
//         content: {
//           title: activity.data?.title || "",
//           to: activity.data?.to || "",
//         },
//       };
//     case ActivityType.CONTENT_APPROVAL:
//       return {
//         ...baseItem,
//         icon: CheckCircle,
//         content: {
//           title: activity.data?.title || "",
//           to: activity.data?.to || "",
//         },
//       };
//     case ActivityType.TOKEN_BUY:
//       return {
//         ...baseItem,
//         icon: ArrowDown,
//         content: {
//           token: activity.data?.token || "",
//           amount: activity.data?.amount || "",
//         },
//         points: `+ ${activity.data?.amount || ""} ${activity.data?.token || ""}`,
//       };
//     case ActivityType.TOKEN_SELL:
//       return {
//         ...baseItem,
//         icon: ArrowUp,
//         content: {
//           token: activity.data?.token || "",
//           amount: activity.data?.amount || "",
//         },
//         points: `- ${activity.data?.amount || ""} ${activity.data?.token || ""}`,
//       };
//     case ActivityType.POINTS_REDEMPTION:
//     case ActivityType.POINTS_AWARDED:
//       return {
//         ...baseItem,
//         icon: Coins,
//         content: {
//           currency: activity.data?.currency || "",
//           amount: activity.data?.amount || "",
//         },
//         points: `${activity.type === ActivityType.POINTS_AWARDED ? "+" : "-"} ${activity.data?.amount || ""} ${activity.data?.currency || ""}`,
//       };
//     default:
//       return baseItem;
//   }
// };

export function ProfileActivity() {
  // const { currentAccountId } = useAuth();
  // const { data: userActivity } = useUserActivity(
  //   currentAccountId || "",
  // );

  // const transformedActivity = userActivity?.map(transformActivityData);
  const hasData = false; // Currently no data is loaded

  return (
    <div>
      <Card className="mb-3">
        <CardContent className="p-0">
          <div className="flex justify-between items-center py-3 px-4">
            <h2 className="text-2xl mt-2 font-semibold">Activity Log</h2>
            <Button variant="outline" size="sm" className="mt-2">
              Filter
              <ChevronsUpDown size={14} className="ml-1" />
            </Button>
          </div>
          <div className="w-full border-t border-dashed border-neutral-300 my-1"></div>
          {/* <ActivityTable data={transformedActivity} /> */}
          {!hasData && (
            <div className="p-8 text-center text-gray-500">
              No activity data available
            </div>
          )}
        </CardContent>
      </Card>

      {hasData && <PaginationControls />}
    </div>
  );
}
