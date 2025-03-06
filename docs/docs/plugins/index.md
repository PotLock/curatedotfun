---
sidebar_position: 0
---

# 🔌 Plugins

Curate.fun has a unique plugin pattern that uses [module federation](https://module-federation.io/), which allows the bot to load and use remote plugins without needing to install or redeploy. These plugins can extend its functionality, particularly for content ingestion, transformation, distribution.

## Plugin Structure

Plugins are defined in two parts in your `curate.config.json`:

1. Plugin Registration:

```json
{
  "plugins": {
    "@curatedotfun/telegram": {
      "type": "distributor",
      "url": "https://unpkg.com/@curatedotfun/telegram@latest/dist/remoteEntry.js"
    },
    "@curatedotfun/ai-transform": {
      "type": "transformer",
      "url": "https://unpkg.com/@curatedotfun/ai-transform@latest/dist/remoteEntry.js"
    }
  }
}
```

2. Plugin Usage in Feeds:

```json
{
  "outputs": {
    "stream": {
      "enabled": true,
      "transform": {
        "plugin": "@curatedotfun/ai-transform",
        "config": {
          // Transformer-specific configuration
        }
      },
      "distribute": [
        {
          "plugin": "@curatedotfun/telegram",
          "config": {
            // Distributor-specific configuration
          }
        }
      ]
    }
  }
}
```

Select a plugin from the sidebar to view its detailed configuration and setup instructions.

## Available Plugins

### Distributors

#### [📱 Telegram Plugin](./distributors/telegram.md)
Distribute curated content to Telegram channels and topics.

#### [📡 RSS Plugin](./distributors/rss.md)
Generate RSS feeds for your curated content.

#### [📝 Notion Plugin](./distributors/notion.md)
Sync content to Notion databases with customizable properties.

#### [💾 Supabase Plugin](./distributors/supabase.md)
Store and manage content in your Supabase database.

#### [🌐 NEAR Social Plugin](./distributors/near-social.md)
Post curated content to NEAR Social, a decentralized social network on the NEAR Protocol.

### Transformers

#### [🤖 AI Transform](./transformers/ai-transform.md)
Transform content using OpenRouter's GPT models for AI-powered content enhancement.

#### [📝 Simple Transform](./transformers/simple-transform.md)
Format content using a template-based approach with customizable placeholders.

### Source Plugins

#### [🐦 Twitter Plugin](./sources/twitter.md)
Monitor and collect content from Twitter.

### Object Transform

#### [🔄 Object Transform](./transformers/object-transform.md)
Transform data structures using a flexible mapping system.
