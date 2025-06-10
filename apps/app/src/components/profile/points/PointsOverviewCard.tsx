import { Card, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { Coins, ChartNoAxesCombined } from "lucide-react";

export const PointsOverviewCard = ({
  totalPoints,
  monthlyIncrease,
  tokensEarned,
}: {
  totalPoints: number;
  monthlyIncrease: string;
  tokensEarned: string;
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <Card className="rounded border-neutral-300">
        <CardContent className="p-6">
          <div className="flex justify-between">
            <div className="flex flex-col">
              <span className="text-sm text-black font-medium">
                Total Points
              </span>
              <span className="text-2xl font-bold mt-2">
                {totalPoints.toLocaleString()}
              </span>
              <p className="text-xs text-neutral-600 mt-1">
                <span className="text-green-600">+{monthlyIncrease}</span>{" "}
                increase this month
              </p>
            </div>
            <ChartNoAxesCombined
              size={16}
              strokeWidth={1.5}
              className="text-neutral-600"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded border-neutral-300">
        <CardContent className="p-6 pb-4 w-full">
          <div className="flex justify-between w-full">
            <div className="flex flex-col w-full">
              <span className="text-sm text-black font-medium">
                Tokens Earned
              </span>
              <span className="text-2xl font-bold mt-2">
                {tokensEarned.toLocaleString()}
              </span>
              <Button variant="filled" className="w-full mt-3">
                Redeem Points
              </Button>
            </div>
            <Coins size={16} strokeWidth={1.5} className="text-neutral-600" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
