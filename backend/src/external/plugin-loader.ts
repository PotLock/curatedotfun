import { loadRemote, init } from '@module-federation/runtime';
import { DistributorPlugin } from '../types/plugin';
import { DBOperations } from '../services/db/operations';

export async function loadRssPlugin(dbOperations?: DBOperations): Promise<DistributorPlugin> {
  // Initialize module federation runtime
  init({
    name: 'host',
    remotes: [
      {
        name: 'rss',
        entry: 'http://localhost:3002/remoteEntry.js',
      },
    ],
  });

  // Load the plugin
  const { default: RssPluginClass } = await loadRemote('@curatedotfun/distributor-rss/plugin') as { default: new (dbOps?: DBOperations) => DistributorPlugin };
  return new RssPluginClass(dbOperations);
}
