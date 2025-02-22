---
sidebar_position: 1
---

# ⚙️ Configuration

Configure your curate.fun instance through the `curate.config.json` file ⚡

## 🏗️ Structure

### 🌍 Global Settings

```json
{
  "global": {
    "botId": "curatedotfun", // @handle for twitter bot
    "defaultStatus": "pending",
    "maxDailySubmissionsPerUser": 15,
    "blacklist": { // ignore submissions according to inbound platform
      "twitter": [
        "blocked_id"
      ]
    }
  }
}
```

### 🔌 Plugins

Plugins extend functionality with transformations and distribution capabilities. See the [Plugins](/docs/plugins) section for detailed documentation on each plugin.

```json
{
  "plugins": {
    "@curatedotfun/telegram": {
      "type": "distributor",
      "url": "https://unpkg.com/@curatedotfun/telegram@latest/dist/remoteEntry.js"
    },
    "@curatedotfun/rss": {
      "type": "distributor",
      "url": "https://unpkg.com/@curatedotfun/rss@latest/dist/remoteEntry.js"
    },
    "@curatedotfun/ai-transform": {
      "type": "transformer",
      "url": "https://unpkg.com/@curatedotfun/ai-transform@latest/dist/remoteEntry.js"
    }
  }
}
```

### 📡 Feeds

Each feed represents a distinct content stream:

```json
{
  "feeds": [
    {
      "id": "example", // hashtag
      "name": "Example Feed",
      "description": "Example feed description",
      "moderation": {
        "approvers": {
          "twitter": ["approver1", "approver2"] // twitter handles, without @
        }
      },
      "outputs": {
        "stream": {
          "enabled": true, // if enabled but no distribute, then will sit in queue
          "transform": {  // Optional
            "plugin": "@curatedotfun/ai-transform",
            "config": {
              "prompt": "Format this update..."
            }
          },
          "distribute": [  // Optional (can be processed later, with /api/feed/:feedId/process)
            {
              "plugin": "@curatedotfun/telegram",
              "config": {
                "botToken": "{TELEGRAM_BOT_TOKEN}",
                "channelId": "{TELEGRAM_CHANNEL_ID}"
              }
            },
            {
              "plugin": "@curatedotfun/rss",
              "config": {
                "title": "Feed Title",
                "path": "./public/feed.xml"
              }
            }
          ]
        },
        "recap": {
          "enabled": false,
          "schedule": "0 0 * * *",
          "transform": { // Required to summarize
            "plugin": "@curatedotfun/ai-transform",
            "config": {
              "prompt": "./prompts/recap.txt"
            }
          },
          "distribute": [ // Required for recap
            {
              "plugin": "@curatedotfun/telegram",
              "config": {
                "botToken": "{TELEGRAM_BOT_TOKEN}", // gets injected by .env
                "channelId": "{TELEGRAM_CHANNEL_ID}"
              }
            }
          ]
        }
      }
    }
  ]
}
```

## 🔄 Stream Configuration

Stream configuration controls real-time content distribution:

```typescript
outputs: {
  stream?: {
    enabled: boolean;
    transform?: {  // Optional transformation
      plugin: string;
      config: {
        prompt: string;
      };
    };
    distribute?: [  // Optional distribution, can configure multiple
      {
        plugin: string;
        config: Record<string, string>;
      }
    ];
  };
}
```

When `stream` is enabled:

- 🔄 Without `transform`, content is distributed as-is
- 📥 Without `distribute`, submissions stay in queue until:
  - ✅ Distribution is added later (/api/feeds/:feedId/process)
  - 📅 Recap schedule completes
  - 🗑️ Manual removal

This queue system helps you:

- 📦 Collect submissions for later
- 🔌 Add distribution channels flexibly
- 📝 Use content in recaps only

## 📅 Recap Configuration

Recap configuration handles periodic content summaries:

```typescript
outputs: {
  recap?: {
    enabled: boolean;
    schedule: string;  // Cron expression
    transform: {      // Required
      plugin: string;
      config: {
        prompt: string;
      };
    };
    distribute: [     // Required
      {
        plugin: string;
        config: Record<string, string>;
      }
    ];
  };
}
```

Key differences from stream configuration:

- 🔄 `transform` is required (content must be summarized)
- 📢 `distribute` is required (summaries must be distributed)

📝 Note: Messages in a recap are removed from the queue after distribution.
