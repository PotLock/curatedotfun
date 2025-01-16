import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    // Fetch feeds and redirect to the first one
    const response = await fetch('/api/feeds');
    if (!response.ok) {
      throw new Error('Failed to fetch feeds');
    }
    const feeds = await response.json();
    
    if (feeds.length > 0) {
      throw redirect({
        to: '/feed/$feedId',
        params: { feedId: feeds[0].id },
      });
    }
    
    return null;
  },
  component: Index,
});

function Index() {
  return (
    <div className="p-8 text-center">
      <h1 className="text-2xl font-bold mb-4">No Feeds Available</h1>
      <p className="text-gray-600">Please configure at least one feed to get started.</p>
    </div>
  );
}
