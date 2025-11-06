import { Card, CardContent } from "../../ui/card";
import { BadgeCent } from "lucide-react";

interface BadgeItem {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  iconBgColor: string;
  points: number;
  achieved: boolean;
  progress?: number;
  total?: number;
  iconName?: string;
}

export function BadgeCard({ badge }: { badge: BadgeItem }) {
  return (
    <Card className="flex-1 rounded border-neutral-300">
      <CardContent className="p-4">
        <div className="flex flex-col items-center text-center gap-2">
          <div
            className={`w-16 h-16 rounded-full ${badge.iconBgColor} flex items-center justify-center`}
          >
            {badge.icon}
          </div>
          <h3 className="font-semibold text-base font-sans">{badge.title}</h3>
          <p className="text-sm text-muted-foreground">{badge.subtitle}</p>

          <div className="w-full border-t border-dashed border-black my-1"></div>

          {!badge.progress && (
            <div className="flex items-center gap-1">
              <span className="text-sm font-semibold">
                {badge.points} Points
              </span>
              {badge.achieved && (
                <BadgeCent
                  size={24}
                  strokeWidth={1.5}
                  className="text-green-600"
                />
              )}
            </div>
          )}

          {badge.progress !== undefined && badge.total !== undefined && (
            <div className="w-full mt-2">
              <div className="w-full h-2 bg-green-100 rounded-full">
                <div
                  className="h-2 bg-green-600 rounded-full"
                  style={{ width: `${(badge.progress / badge.total) * 100}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span>40</span>
                <span>{badge.points} Points</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
