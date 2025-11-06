import { Modal } from "./Modal";
import { useLeaderboard, LeaderboardEntry } from "../lib/api";

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LeaderboardModal = ({
  isOpen,
  onClose,
}: LeaderboardModalProps) => {
  const { data: leaderboard, isLoading, error } = useLeaderboard();

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-4">
        <h2 className="text-2xl font-bold mb-4">Curator Leaderboard</h2>

        {isLoading && (
          <div className="text-center py-8">
            <p>Loading leaderboard data...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-8 text-red-500">
            <p>Error loading leaderboard: {(error as Error).message}</p>
          </div>
        )}

        {leaderboard && leaderboard.length === 0 && (
          <div className="text-center py-8">
            <p>No curator data available.</p>
          </div>
        )}

        {leaderboard && leaderboard.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-black">
                  <th className="px-4 py-2 text-left">Rank</th>
                  <th className="px-4 py-2 text-left">Curator</th>
                  <th className="px-4 py-2 text-left">Total Submissions</th>
                  <th className="px-4 py-2 text-left">Feed Contributions</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry: LeaderboardEntry, index: number) => (
                  <tr
                    key={entry.curatorId}
                    className="border-b border-gray-200"
                  >
                    <td className="px-4 py-2">{index + 1}</td>
                    <td className="px-4 py-2">
                      <a
                        href={`https://twitter.com/${entry.curatorUsername}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        @{entry.curatorUsername}
                      </a>
                    </td>
                    <td className="px-4 py-2">{entry.submissionCount}</td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-1">
                        {entry.feedSubmissions.map((feedSub) => (
                          <span
                            key={feedSub.feedId}
                            className="inline-block px-2 py-1 bg-gray-100 text-xs rounded-md"
                            title={`${feedSub.count} of ${feedSub.totalInFeed} submissions in ${feedSub.feedId}`}
                          >
                            {feedSub.feedId}: {feedSub.count}/
                            {feedSub.totalInFeed}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
};
