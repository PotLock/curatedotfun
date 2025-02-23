export class MockProcessorService {
  public processedItems: { content: any; config: any }[] = [];

  async process(content: any, config: any) {
    this.processedItems.push({ content, config });
  }

  async processBatch(items: any[], config: any) {
    this.processedItems.push({ content: items, config });
  }
}
