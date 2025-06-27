import { ChevronUp } from "lucide-react";
import { createColumnHelper } from "@tanstack/react-table";
import { LeaderboardEntry } from "../../lib/api";
import { UserLink } from "../FeedItem";
import { Link } from "@tanstack/react-router";

export interface ExtendedLeaderboardEntry extends LeaderboardEntry {
  originalRank: number;
}

export function createLeaderboardColumns(
  expandedRows: number[],
  toggleRow: (index: number) => void,
) {
  const columnHelper = createColumnHelper<ExtendedLeaderboardEntry>();

  return [
    columnHelper.accessor("originalRank", {
      header: "Rank",
      cell: (info) => {
        const rank = info.getValue();
        return (
          <div className="flex items-center w-[35px] h-[32px]">
            {rank === 1 && (
              <img
                src="/icons/star-gold.svg"
                className="h-4 w-4 mr-1"
                alt="Gold star - 1st place"
              />
            )}
            {rank === 2 && (
              <img
                src="/icons/star-silver.svg"
                className="h-4 w-4 mr-1"
                alt="Silver star - 2nd place"
              />
            )}
            {rank === 3 && (
              <img
                src="/icons/star-bronze.svg"
                className="h-4 w-4 mr-1"
                alt="Bronze star - 3rd place"
              />
            )}
            <div className="flex w-full text-right justify-end">
              <span className="text-[#111111] font-medium">{rank}</span>
            </div>
          </div>
        );
      },
    }),
    columnHelper.accessor("curatorUsername", {
      header: "Username",
      cell: (info) => (
        <div className="flex items-center gap-2 h-[32px]">
          <UserLink username={info.getValue()} />
        </div>
      ),
    }),
    columnHelper.accessor(
      (row) => {
        return row.submissionCount > 0
          ? Math.round((row.approvalCount / row.submissionCount) * 100)
          : 0;
      },
      {
        id: "approvalRate",
        header: "Approval Rate",
        cell: (info) => (
          <div className="flex items-center h-[32px]">{info.getValue()}%</div>
        ),
      },
    ),
    columnHelper.accessor("submissionCount", {
      header: "Submissions",
      cell: (info) => (
        <div className="flex items-center text-[#111111] font-medium h-[32px]">
          {info.getValue()}
        </div>
      ),
    }),
    columnHelper.accessor("feedSubmissions", {
      header: "Top Feeds",
      cell: (info) => {
        const feedSubmissions = info.getValue();
        const rowIndex = info.row.index;

        return (
          <div className="flex flex-col min-h-[32px] justify-center">
            <div className="flex items-center gap-2">
              {feedSubmissions && feedSubmissions.length > 0 && (
                <Link
                  to={"/feed/$feedId"}
                  params={{ feedId: feedSubmissions[0].feedId }}
                >
                  <div className="flex items-center justify-between gap-1 border border-neutral-400 px-2 py-1 rounded-md w-[150px] min-w-0">
                    <span className="text-sm truncate flex-shrink">
                      #{feedSubmissions[0].feedId}
                    </span>
                    <span className="text-sm whitespace-nowrap flex-shrink-0">
                      {feedSubmissions[0].count}/
                      {feedSubmissions[0].totalInFeed}
                    </span>
                  </div>
                </Link>
              )}

              {feedSubmissions && feedSubmissions.length > 1 && (
                <button
                  onClick={() => toggleRow(rowIndex)}
                  className="w-8 h-8 flex items-center justify-center border border-neutral-400 rounded-md transition-colors"
                >
                  {expandedRows.includes(rowIndex) ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <span className="text-xs">
                      +{feedSubmissions.length - 1}
                    </span>
                  )}
                </button>
              )}
            </div>

            {feedSubmissions && expandedRows.includes(rowIndex) && (
              <div className="flex flex-col gap-2 mt-2 pl-0">
                {feedSubmissions.slice(1).map((feed, feedIndex) => (
                  <div key={feedIndex} className="flex items-center">
                    <div className="flex items-center gap-1 border border-neutral-400 px-2 py-1 rounded-md justify-between w-[150px] min-w-0">
                      <span className="text-sm truncate flex-shrink">
                        #{feed.feedId}
                      </span>
                      <span className="text-sm whitespace-nowrap flex-shrink-0">
                        {feed.count}/{feed.totalInFeed}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      },
    }),
  ];
}
