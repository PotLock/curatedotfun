import { flexRender, Table as TanStackTable } from "@tanstack/react-table";
import { ChevronUp, ChevronDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { ExtendedLeaderboardEntry } from "./LeaderboardColumns";
import { LeaderboardSkeleton } from "./LeaderboardSkeleton";

interface LeaderboardTableProps {
  table: TanStackTable<ExtendedLeaderboardEntry>;
  isLoading: boolean;
  error: Error | null;
  hasData: boolean;
}

export function LeaderboardTable({
  table,
  isLoading,
  error,
  hasData,
}: LeaderboardTableProps) {
  return (
    <div className="overflow-y-auto max-w-[368px] md:max-w-screen-xl md:w-full mx-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
      <div className="relative">
        <Table className="w-full border-collapse">
          <TableHeader className="sticky top-0 bg-white z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="border-b border-[#e5e5e5]"
              >
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="text-left py-3 px-2 font-medium text-sm whitespace-nowrap cursor-pointer"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                      {header.column.getIsSorted() === "asc" ? (
                        <ChevronUp className="h-4 w-4 text-gray-500" />
                      ) : header.column.getIsSorted() === "desc" ? (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      ) : null}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody className="overflow-x-auto">
            {isLoading && <LeaderboardSkeleton rows={8} />}

            {error && (
              <TableRow>
                <TableCell colSpan={5} className="text-left py-8 text-red-500">
                  <p>Error loading leaderboard: {error.message}</p>
                </TableCell>
              </TableRow>
            )}

            {!hasData && !isLoading && !error && (
              <TableRow>
                <TableCell colSpan={5} className="text-left py-8">
                  <p>No curator data available.</p>
                </TableCell>
              </TableRow>
            )}

            {!isLoading && !error && table.getRowModel().rows.length > 0
              ? table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="border-b border-[#e5e5e5] hover:bg-[#f9fafb]"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className="py-2 px-2 align-middle"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : !isLoading &&
                !error &&
                table.getRowModel().rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-left py-8">
                      <p>No matching results found.</p>
                    </TableCell>
                  </TableRow>
                )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
