import { Table, TableBody, TableCell, TableRow } from "../../ui/table";

import { ArrowDown, ArrowUp, ThumbsUp } from "lucide-react";

interface PointLogItem {
  id: number;
  type: string;
  description: string;
  points: number;
  time: string;
  isPositive: boolean;
}

export function PointsLogTable({ data }: { data: PointLogItem[] }) {
  return (
    <Table className="border-spacing-6 border-separate">
      <TableBody>
        {data.map((item) => (
          <TableRow key={item.id} className="border-b py-3 border-gray-100">
            <TableCell className="w-10 py-3">
              <div
                className={`w-8 h-8 rounded-md border ${
                  item.id === 4
                    ? "bg-red-50 border-red-400 text-red-400"
                    : "bg-green-50 border-green-400 text-green-400"
                } flex items-center justify-center`}
              >
                {item.id === 4 ? (
                  <ArrowUp size={16} className="text-red-400" />
                ) : (
                  <ArrowDown size={16} className="text-green-600" />
                )}
              </div>
            </TableCell>

            <TableCell className="pr-4">
              <div>
                <span className="text-xs text-black/50 font-medium">Type</span>
                <p className="text-sm text-black font-medium">
                  {item.description}
                </p>
              </div>
            </TableCell>

            <TableCell className="">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                  <ThumbsUp size={12} className="text-gray-500" />
                </div>
                <div>
                  <span className="text-xs text-black/50 font-medium">
                    Points
                  </span>
                  <p className="text-sm text-black font-medium">
                    {item.isPositive ? "+" : "-"} {item.points}
                  </p>
                </div>
              </div>
            </TableCell>

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
