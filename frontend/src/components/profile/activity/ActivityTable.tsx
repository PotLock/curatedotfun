import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "../../../components/ui/table";

import {
  ArrowDown,
  ArrowUp,
  CheckCircle,
  Coins,
  FileText,
  LucideIcon,
} from "lucide-react";

// Activity content types
interface ContentSubmissionContent {
  title: string;
  to: string;
  image?: string;
}

interface TokenTransactionContent {
  token: string;
  amount: string;
  image?: string;
}

interface PointsRedemptionContent {
  currency: string;
  amount: string;
  image?: string;
}

// Union type for different content types
type ActivityContent =
  | ContentSubmissionContent
  | TokenTransactionContent
  | PointsRedemptionContent;

// Main activity item interface
interface ActivityItem {
  type: string;
  icon: LucideIcon;
  time: string;
  content: ActivityContent;
  to?: string;
  title?: string;
  points?: string;
}

// Sample data based on the image
const activityData: ActivityItem[] = [
  {
    type: "Content Submission",
    icon: FileText,
    time: "10:29PM",
    content: {
      title: "Understanding Ethereum 2.0",
      to: "Crypto Grant Wire",
    },
    to: "Crypto Grant Wire",
    title: "Understanding Ethereum 2.0",
  },
  {
    type: "Approved Content",
    icon: CheckCircle,
    time: "10:29PM",
    content: {
      title: "Understanding Ethereum 2.0",
      to: "Crypto Grant Wire",
    },
    to: "Crypto Grant Wire",
    title: "Understanding Ethereum 2.0",
  },
  {
    type: "Bought Token",
    icon: ArrowDown,
    time: "10:29PM",
    content: {
      token: "SOL",
      amount: "20",
    },
    points: "+ 20 SOL",
  },
  {
    type: "Points Redemption",
    icon: Coins,
    time: "10:29PM",
    content: {
      currency: "SCURATE",
      amount: "90",
    },
    points: "+ 90 SCURATE",
  },
  {
    type: "Sold Token",
    icon: ArrowUp,
    time: "10:29PM",
    content: {
      currency: "SCURATE",
      amount: "90",
    },
    points: "+ 90 SCURATE",
  },
  {
    type: "Bought Token",
    icon: ArrowDown,
    time: "10:29PM",
    content: {
      token: "SOL",
      amount: "20",
    },
    points: "+ 20 SOL",
  },
  {
    type: "Content Submission",
    icon: FileText,
    time: "10:29PM",
    content: {
      title: "Understanding Ethereum 2.0",
      to: "Crypto Grant Wire",
    },
    to: "Crypto Grant Wire",
    title: "Understanding Ethereum 2.0",
  },
];

export function ActivityTable({
  data = activityData,
}: {
  data?: ActivityItem[];
}) {
  const renderContentCell = (item: ActivityItem) => {
    if ("to" in item && item.to) {
      return (
        <TableCell>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
              <img
                src="/images/near-week.png"
                alt="Checkered Flag"
                className="size-5"
              />
            </div>
            <div>
              <span className="text-xs text-black/50 font-medium">To</span>
              <p className="text-sm text-black font-medium">{item.to}</p>
            </div>
          </div>
          {item.title && (
            <div className="mt-1 ml-8">
              <p className="text-sm text-black font-medium">{item.title}</p>
            </div>
          )}
        </TableCell>
      );
    } else if ("points" in item && item.points) {
      return (
        <TableCell>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
              {item.type.includes("SOL") ? (
                <img src="/images/solana.png" alt="SOL" className="size-5" />
              ) : (
                <img
                  src="/images/solana.png"
                  alt="SCURATE"
                  className="size-5"
                />
              )}
            </div>
            <div>
              <span className="text-xs text-black/50 font-medium">Points</span>
              <p className="text-sm text-black font-medium">{item.points}</p>
            </div>
          </div>
        </TableCell>
      );
    }
    return <TableCell></TableCell>;
  };

  return (
    <Table className="border-spacing-6 border-separate">
      <TableBody>
        {data.map((item, index) => (
          <TableRow key={index} className="border-b py-3 border-gray-100">
            <TableCell className="w-10 py-3">
              <div
                className={`w-8 h-8 rounded-md border ${
                  item.type === "Sold Token"
                    ? "bg-red-50 border-red-400 text-red-400"
                    : "bg-green-50 border-green-400 text-green-400"
                } flex items-center justify-center`}
              >
                <item.icon size={16} />
              </div>
            </TableCell>

            <TableCell className="pr-4">
              <div>
                <span className="text-xs text-black/50 font-medium">Type</span>
                <p className="text-sm text-black font-medium">{item.type}</p>
              </div>
            </TableCell>

            {renderContentCell(item)}

            <TableCell>
              <div>
                <span className="text-xs text-black/50 font-medium">Time</span>
                <p className="text-sm text-black font-medium">{item.time}</p>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
