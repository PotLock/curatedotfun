import { ChevronsUpDown } from "lucide-react";
import { Button } from "../../ui/button";
import { Card, CardContent } from "../../ui/card";
import { PaginationControls } from "./PaginationControls";
import { ActivityTable } from "./ActivityTable";
import {
  useUserActivities,
} from "../../../lib/api";
import { useAuth } from "../../../contexts/AuthContext";
import { FileText, CheckCircle, ArrowDown, ArrowUp, Coins } from "lucide-react";
import type { ActivityItem } from "./ActivityTable";
import type { activityTypeZodEnum } from "@curatedotfun/types";

const transformActivityData = (activity: any): ActivityItem => { // TODO: Fix type
  const baseItem: ActivityItem = {
    type: activity.type,
    time: new Date(activity.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    icon: FileText, // Default icon
    content: {
      title: activity.data?.title || "",
      to: activity.data?.to || "",
    },
  };

  // Map activity types to appropriate icons and content
  switch (activity.type) {
    case activityTypeZodEnum.Enum.CONTENT_SUBMISSION:
      return {
        ...baseItem,
        icon: FileText,
        content: {
          title: activity.data?.title || "",
          to: activity.data?.to || "",
        },
      };
    case activityTypeZodEnum.Enum.CONTENT_APPROVAL:
      return {
        ...baseItem,
        icon: CheckCircle,
        content: {
          title: activity.data?.title || "",
          to: activity.data?.to || "",
        },
      };
    case activityTypeZodEnum.Enum.TOKEN_BUY:
      return {
        ...baseItem,
        icon: ArrowDown,
        content: {
          token: activity.data?.token || "",
          amount: activity.data?.amount || "",
        },
        points: `+ ${activity.data?.amount || ""} ${activity.data?.token || ""}`,
      };
    case activityTypeZodEnum.Enum.TOKEN_SELL:
      return {
        ...baseItem,
        icon: ArrowUp,
        content: {
          token: activity.data?.token || "",
          amount: activity.data?.amount || "",
        },
        points: `- ${activity.data?.amount || ""} ${activity.data?.token || ""}`,
      };
    case activityTypeZodEnum.Enum.POINTS_REDEMPTION:
    case activityTypeZodEnum.Enum.POINTS_AWARDED:
      return {
        ...baseItem,
        icon: Coins,
        content: {
          currency: activity.data?.currency || "",
          amount: activity.data?.amount || "",
        },
        points: `${activity.type === activityTypeZodEnum.Enum.POINTS_AWARDED ? "+" : "-"} ${activity.data?.amount || ""} ${activity.data?.currency || ""}`,
      };
    default:
      return baseItem;
  }
};

export function ProfileActivity() {
  const { user: currentUserProfile } = useAuth();

  const { data: userActivity } = useUserActivities(
    currentUserProfile?.near_account_id || "",
  );

  const transformedActivity = userActivity?.map(transformActivityData);

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
          <ActivityTable data={transformedActivity} />
        </CardContent>
      </Card>

      <PaginationControls />
    </div>
  );
}
