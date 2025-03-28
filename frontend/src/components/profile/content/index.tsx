import { Zap } from "lucide-react";
import { Card, CardDescription, CardTitle } from "../../ui/card";

export function ProfileContent() {
  return (
    <div className="flex flex-col gap-2 items-stretch">
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 flex flex-col gap-4 min-h-[244px]">
          <div className="flex flex-row items-center gap-4 border-b border-neutral-300 border-dashed pb-3">
            <div className="p-3 text-emerald-600 flex items-center justify-center size-[52px] rounded-lg border-emerald-600 border bg-emerald-50">
              <Zap strokeWidth={1} size={28} />
            </div>
            <div className="flex flex-col gap-0">
              <CardTitle className="text-xl font-bold text-black">
                Top Performing
              </CardTitle>
              <CardDescription className="text-base font-semibold text-emerald-500">
                Your best content this week
              </CardDescription>
            </div>
          </div>
        </Card>
        <Card className="p-4 flex flex-col gap-4 min-h-[244px]">
          <div className="flex flex-row items-center gap-4 border-b border-neutral-300 border-dashed pb-3">
            <div className="p-3 text-emerald-600 flex items-center justify-center size-[52px] rounded-lg border-emerald-600 border bg-emerald-50">
              <Zap strokeWidth={1} size={28} />
            </div>
            <div className="flex flex-col gap-0">
              <CardTitle className="text-xl font-bold text-black">
                Top Performing
              </CardTitle>
              <CardDescription className="text-base font-semibold text-emerald-500">
                Your best content this week
              </CardDescription>
            </div>
          </div>
        </Card>
        <Card className="p-4 flex flex-col gap-4 min-h-[244px]">
          <div className="flex flex-row items-center gap-4 border-b border-neutral-300 border-dashed pb-3">
            <div className="p-3 text-emerald-600 flex items-center justify-center size-[52px] rounded-lg border-emerald-600 border bg-emerald-50">
              <Zap strokeWidth={1} size={28} />
            </div>
            <div className="flex flex-col gap-0">
              <CardTitle className="text-xl font-bold text-black">
                Top Performing
              </CardTitle>
              <CardDescription className="text-base font-semibold text-emerald-500">
                Your best content this week
              </CardDescription>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
