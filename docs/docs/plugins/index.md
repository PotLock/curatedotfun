---
sidebar_position: 0
---

# 🔌 Plugins

curate.fun supports various plugins that extend its functionality, particularly for content distribution. Each plugin enables you to distribute curated content to different platforms and channels.

## Plugin Structure

Plugins are defined in two parts in your `curate.config.json`:

1. Plugin Registration:

```json
{
  "plugins": {
    "@curatedotfun/telegram": {
      "type": "distributor",
      "url": "./external/telegram"
    },
    "@curatedotfun/gpt-transform": {
      "type": "transformer",
      "url": "./external/gpt-transform"
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
        "plugin": "@curatedotfun/gpt-transform",
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

### [📱 Telegram Plugin](./distributors/telegram.md)

Distribute curated content to Telegram channels and topics.

### [🤖 GPT Transform](./transformers/gpt-transform.md)

Transform content using OpenRouter's GPT models for AI-powered content enhancement.

### [📝 Simple Transform](./transformers/simple-transform.md)

Format content using a template-based approach with customizable placeholders.
