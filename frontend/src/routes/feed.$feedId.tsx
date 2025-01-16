import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import Layout from '../components/Layout';
import FeedList from '../components/FeedList';
import LiveStatus from '../components/LiveStatus';

interface Feed {
  id: string;
  name: string;
  hashtag: string;
  admins: string[];
  plugins: {
    name: string;
    config: Record<string, unknown>;
  }[];
}

interface FeedItem {
  id: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  tweetId: string;
}

export const Route = createFileRoute('/feed/$feedId')({
  component: FeedPage,
});

function FeedPage() {
  const { feedId } = Route.useParams();
  
  const { data: feed } = useQuery<Feed>({
    queryKey: ['feed', feedId],
    queryFn: async () => {
      const response = await fetch(`/api/config/${feedId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch feed config');
      }
      return response.json();
    },
  });

  const { data: items = [] } = useQuery<FeedItem[]>({
    queryKey: ['feed-items', feedId],
    queryFn: async () => {
      const response = await fetch(`/api/feed/${feedId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch feed items');
      }
      return response.json();
    },
  });

  const sidebarContent = (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Feeds</h1>
        <LiveStatus />
      </div>
      <FeedList />
    </div>
  );

  const rightPanelContent = feed && (
    <div className="p-4 space-y-8">
      <div>
        <h3 className="text-lg font-semibold mb-4">Admins</h3>
        <ul className="space-y-2">
          {feed.admins?.map((admin) => (
            <li
              key={admin}
              className="px-3 py-2 bg-gray-50 rounded text-sm text-gray-700"
            >
              {admin}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Plugins</h3>
        <div className="space-y-4">
          {feed.plugins?.map((plugin) => (
            <div
              key={plugin.name}
              className="p-4 bg-gray-50 rounded-lg"
            >
              <h4 className="font-medium mb-2">{plugin.name}</h4>
              <pre className="text-xs bg-white p-2 rounded">
                {JSON.stringify(plugin.config, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <Layout
      sidebar={sidebarContent}
      rightPanel={rightPanelContent}
    >
      <div className="space-y-4">
        <h2 className="text-2xl font-bold mb-6">{feed?.name || 'Loading...'}</h2>
        {items?.map((item) => (
          <div
            key={item.id}
            className={`p-4 rounded-lg border ${
              item.status === 'approved'
                ? 'border-green-200 bg-green-50'
                : item.status === 'rejected'
                ? 'border-red-200 bg-red-50'
                : 'border-gray-200 bg-white'
            }`}
          >
            <p className="text-gray-800">{item.content}</p>
            <div className="mt-2 text-sm text-gray-500">
              Tweet ID: {item.tweetId}
            </div>
          </div>
        ))}
      </div>

    </Layout>
  );
}
