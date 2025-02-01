
    export type RemoteKeys = '@curatedotfun/distributor-rss/plugin';
    type PackageType<T> = T extends '@curatedotfun/distributor-rss/plugin' ? typeof import('@curatedotfun/distributor-rss/plugin') :any;