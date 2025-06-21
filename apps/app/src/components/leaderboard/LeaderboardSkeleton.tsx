import { TableCell, TableRow } from "../ui/table";

function SkeletonRow() {
  return (
    <TableRow className="border-b border-[#e5e5e5]">
      {/* Rank column */}
      <TableCell className="py-2 px-2 align-middle">
        <div className="flex items-center w-[35px] h-[32px]">
          <div className="w-4 h-4 bg-gray-200 rounded animate-pulse mr-1" />
          <div className="w-6 h-4 bg-gray-200 rounded animate-pulse" />
        </div>
      </TableCell>

      {/* Username column */}
      <TableCell className="py-2 px-2 align-middle">
        <div className="flex items-center gap-2 h-[32px]">
          <div className="w-24 h-4 bg-gray-200 rounded animate-pulse" />
        </div>
      </TableCell>

      {/* Approval Rate column */}
      <TableCell className="py-2 px-2 align-middle">
        <div className="flex items-center h-[32px]">
          <div className="w-12 h-4 bg-gray-200 rounded animate-pulse" />
        </div>
      </TableCell>

      {/* Submissions column */}
      <TableCell className="py-2 px-2 align-middle">
        <div className="flex items-center h-[32px]">
          <div className="w-8 h-4 bg-gray-200 rounded animate-pulse" />
        </div>
      </TableCell>

      {/* Top Feeds column */}
      <TableCell className="py-2 px-2 align-middle">
        <div className="flex flex-col min-h-[40px] justify-center">
          <div className="flex items-center gap-2">
            <div className="w-[150px] h-8 bg-gray-200 rounded animate-pulse" />
            <div className="w-8 h-8 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}

interface LeaderboardSkeletonProps {
  rows?: number;
}

export function LeaderboardSkeleton({ rows = 8 }: LeaderboardSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, index) => (
        <SkeletonRow key={index} />
      ))}
    </>
  );
}
