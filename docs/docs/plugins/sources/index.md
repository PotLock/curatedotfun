---
sidebar_position: 1
---

# 📥 Source System

The source system enables content ingestion through various platform-specific plugins. Each source plugin monitors and processes content from a specific platform, providing a standardized submission format for the curation system.

## 🏗️ Architecture

### Source Pipeline

Content flows through three main stages:

1. **Content Monitoring**: Source plugins watch for new content submissions
2. **Content Processing**: Raw content is transformed into a standardized format
3. **Submission Handling**: Processed content enters the curation system

### Configuration Placement

Sources are configured in your `curate.config.json` under the `sources` section:

```json
{
  "sources": [
    {
      "plugin": "@curatedotfun/twitter",
      "config": {
        // Source-specific configuration
      }
    }
  ]
}
```

## 💡 Example Configuration

Here's a complete example showing Twitter source configuration:

```json
{
  "sources": [
    {
      "plugin": "@curatedotfun/twitter",
      "config": {
        "username": "curatedotfun",
        "monitorMentions": true,
        "monitorReplies": true,
        "monitorHashtags": ["#curatedotfun"],
        "submissionFormat": {
          "content": "{{tweet.text}}",
          "submissionId": "{{tweet.id}}",
          "username": "{{tweet.author.username}}",
          "firstName": "{{tweet.author.firstName}}",
          "lastName": "{{tweet.author.lastName}}"
        }
      }
    }
  ]
}
```

## 🔌 Available Sources

- [Twitter](./twitter.md) - Monitor tweets, mentions, replies, and hashtags
- Telegram (Coming Soon) - Monitor messages in channels and groups
- LinkedIn (Planned) - Monitor posts and updates

## 🔒 Type Safety

Source plugins use TypeScript interfaces to ensure type safety:

```typescript
interface SourcePlugin<TConfig> {
  initialize(config: TConfig): Promise<void>;
  startMonitoring(): Promise<void>;
  stopMonitoring(): Promise<void>;
}

interface Submission {
  content: string;
  submissionId: string;
  username: string;
  firstName?: string;
  lastName?: string;
  metadata?: Record<string, any>;
}
```

## 🚀 Best Practices

1. **Configure Error Handling** to manage platform-specific issues
2. **Use Rate Limiting** to respect platform API constraints
3. **Implement Retries** for transient failures
4. **Monitor Performance** to ensure efficient content processing
5. **Document Platform Requirements** for custom source plugins

:::tip
Start with a single source plugin and thoroughly test its configuration before adding additional sources.
:::
