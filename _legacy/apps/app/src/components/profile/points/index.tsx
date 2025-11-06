import { Award, ChevronsUpDown, FileText, Leaf, Search } from "lucide-react";
import { PointsOverviewCard } from "./PointsOverviewCard";
import { BadgeCard } from "./BadgeCard";
import { Card, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { PointsLogTable } from "./PointsLogTable";
import { PaginationControls } from "./PaginationControls";

const badgesData = [
  {
    title: "Content Novice",
    subtitle: "Successfully Create 50 Content",
    icon: <FileText size={24} />,
    iconBgColor: "bg-yellow-200",
    points: 100,
    achieved: true,
    iconName: "badge-cent",
  },
  {
    title: "Content Master",
    subtitle: "Successfully Create 50 Content",
    icon: <Award size={24} />,
    iconBgColor: "bg-gray-300",
    points: 100,
    achieved: true,
    iconName: "badge-cent",
  },
  {
    title: "Curator OG",
    subtitle: "Successfully Curate 1000 Content",
    icon: <Search size={24} />,
    iconBgColor: "bg-blue-300",
    points: 100,
    achieved: true,
    iconName: "badge-cent",
  },
  {
    title: "Content Master",
    subtitle: "Successfully Create 50 Content",
    icon: <Leaf size={24} />,
    iconBgColor: "bg-green-200",
    points: 500,
    achieved: false,
    progress: 40,
    total: 100,
  },
];

const pointsLogData = [
  {
    id: 1,
    type: "Content Submission",
    description: "Content Submission",
    points: 50,
    time: "10:24PM",
    isPositive: true,
  },
  {
    id: 2,
    type: "Approved Content",
    description: "Approved Content",
    points: 20,
    time: "10:20PM",
    isPositive: true,
  },
  {
    id: 3,
    type: "Approved Content",
    description: "Approved Content",
    points: 20,
    time: "10:20PM",
    isPositive: true,
  },
  {
    id: 4,
    type: "Points Redemption",
    description: "Points Redemption",
    points: 90,
    time: "10:20PM",
    isPositive: false,
  },
  {
    id: 5,
    type: "Approved Content",
    description: "Approved Content",
    points: 20,
    time: "10:20PM",
    isPositive: true,
  },
  {
    id: 6,
    type: "Approved Content",
    description: "Approved Content",
    points: 20,
    time: "10:20PM",
    isPositive: true,
  },
  {
    id: 7,
    type: "Approved Content",
    description: "Approved Content",
    points: 20,
    time: "10:20PM",
    isPositive: true,
  },
];

export function ProfilePoints() {
  return (
    <div className="flex flex-col w-full">
      <section className="mb-[30px]">
        <h2 className="text-2xl font-semibold mb-3">Points Overview</h2>
        <PointsOverviewCard
          totalPoints={2000}
          monthlyIncrease="5%"
          tokensEarned="250 $CGW"
        />
      </section>

      <section className="mb-[30px]">
        <h2 className="text-2xl font-semibold mb-3">Badges & Achievement</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {badgesData.map((badge, index) => (
            <BadgeCard key={index} badge={badge} />
          ))}
        </div>
      </section>

      <section>
        <Card className="mb-3">
          <CardContent className="p-0">
            <div className="flex justify-between items-center py-3 px-4">
              <h2 className="text-2xl mt-2 font-semibold">Points Log</h2>

              <Button variant="outline" size="sm" className="mt-2">
                Filter
                <ChevronsUpDown size={14} className="ml-1" />
              </Button>
            </div>
            <div className="w-full border-t border-dashed border-neutral-300 my-1"></div>
            <PointsLogTable data={pointsLogData} />
          </CardContent>
        </Card>

        <PaginationControls />
      </section>
    </div>
  );
}
