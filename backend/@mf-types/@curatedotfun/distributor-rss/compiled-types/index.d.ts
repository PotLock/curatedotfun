import { RssService } from "./rss.service";
import { DistributorPlugin, DBOperations } from "./types";
export default class RssPlugin implements DistributorPlugin {
    name: string;
    private services;
    private dbOps?;
    getServices(): Map<string, RssService>;
    constructor(dbOperations?: DBOperations);
    initialize(feedId: string, config: Record<string, string>): Promise<void>;
    distribute(feedId: string, content: string): Promise<void>;
    private writeToFile;
    private escapeXml;
    shutdown(): Promise<void>;
}
//# sourceMappingURL=index.d.ts.map