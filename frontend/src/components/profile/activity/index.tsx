import { ChevronsUpDown } from "lucide-react";
import { Button } from "../../ui/button";
import { Card, CardContent } from "../../ui/card";
import { PaginationControls } from "./PaginationControls";
import { ActivityTable } from "./ActivityTable";

export function ProfileActivity() {
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
          <ActivityTable />
        </CardContent>
      </Card>

      <PaginationControls />
    </div>
  );
}
