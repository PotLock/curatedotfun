import { DBOperations, RssItem } from "./types";
export declare class RssService {
    private feedId;
    private title;
    private maxItems;
    private path?;
    private dbOps?;
    constructor(feedId: string, title: string, maxItems?: number, path?: string | undefined, dbOps?: DBOperations | undefined);
    saveItem(item: RssItem): void;
    getItems(limit?: number): RssItem[];
    getTitle(): string;
    getPath(): string | undefined;
    getMaxItems(): number;
}
//# sourceMappingURL=rss.service.d.ts.map