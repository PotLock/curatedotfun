---
sidebar_position: 2
---

# 🔌 Using Plugins for Content Workflows

Learn how to leverage curate.fun's plugin system to automate your content curation and distribution workflows ⚡

## 🌟 What Are Plugins?

Plugins extend curate.fun's functionality, allowing you to:

- 📥 **Source content** from different platforms
- 🔄 **Transform content** into different formats
- 📤 **Distribute content** to various platforms

As a user, you don't need to write code - you can simply configure existing plugins to create powerful content workflows.

## 🛠️ Setting Up Plugin Workflows

### Basic Workflow Structure

A typical content workflow has three stages:

1. **Source**: Where content comes from (e.g., Twitter)
2. **Transform**: How content is modified (e.g., AI enhancement, formatting)
3. **Distribute**: Where content goes (e.g., Telegram, RSS, Notion)

The workflow follows a linear path: Source → Transform → Distribute

### Configuration Structure

A complete `curate.config.json` file has several key sections:

```json
{
  "global": {
    // Global settings
  },
  "plugins": {
    // Plugin registration
  },
  "feeds": [
    // Feed configurations
  ]
}
```

#### 1. Plugin Registration

First, register the plugins you want to use:

```json
"plugins": {
  "@curatedotfun/telegram": {
    "type": "distributor",
    "url": "https://unpkg.com/@curatedotfun/telegram@latest/dist/remoteEntry.js"
  },
  "@curatedotfun/rss": {
    "type": "distributor",
    "url": "https://unpkg.com/@curatedotfun/rss@latest/dist/remoteEntry.js"
  },
  "@curatedotfun/simple-transform": {
    "type": "transformer",
    "url": "https://unpkg.com/@curatedotfun/simple-transform@latest/dist/remoteEntry.js"
  },
  "@curatedotfun/object-transform": {
    "type": "transformer",
    "url": "https://unpkg.com/@curatedotfun/object-transform@latest/dist/remoteEntry.js"
  },
  "@curatedotfun/ai-transform": {
    "type": "transformer",
    "url": "https://unpkg.com/@curatedotfun/ai-transform@latest/dist/remoteEntry.js"
  }
}
```

#### 2. Feed Configuration

Then configure each feed with its own workflow:

```json
"feeds": [
  {
    "id": "ethereum",
    "name": "This Week in Ethereum",
    "description": "Ethereum ecosystem updates",
    "moderation": {
      "approvers": {
        "twitter": ["user1", "user2"]
      }
    },
    "outputs": {
      "stream": {
        "enabled": true,
        "transform": [
          {
            "plugin": "@curatedotfun/object-transform",
            "config": {
              "mappings": {
                "source": "https://x.com/{{username}}/status/{{tweetId}}",
                "content": "{{content}}",
                "author": "{{username}}",
                "notes": "{{curator.notes}}",
                "submittedAt": "{{submittedAt}}"
              }
            }
          },
          {
            "plugin": "@curatedotfun/ai-transform",
            "config": {
              "prompt": "Summarize the content into a concise news flash",
              "apiKey": "{OPENROUTER_API_KEY}",
              "schema": {
                "title": {
                  "type": "string",
                  "description": "Title derived from summary of content"
                },
                "summary": {
                  "type": "string",
                  "description": "Summary of content influenced by curator notes"
                }
              }
            }
          }
        ],
        "distribute": [
          {
            "transform": [
              {
                "plugin": "@curatedotfun/simple-transform",
                "config": {
                  "template": "🔷 Ethereum: *{{title}}*\n\n{{summary}}\n\n👤 Source [@{{author}}](https://x.com/{{author}})_\n🔗 [Read More](<{{source}}>)"
                }
              }
            ],
            "plugin": "@curatedotfun/telegram",
            "config": {
              "botToken": "{TELEGRAM_BOT_TOKEN}",
              "channelId": "@your_channel"
            }
          }
        ]
      }
    }
  }
]
```

## 🚀 Popular Plugin Combinations

### Content Repurposing Workflow

Transform tweets into longer-form content for different platforms:

```json
{
  "transform": {
    "plugin": "@curatedotfun/ai-transform",
    "config": {
      "prompt": "Expand this tweet into a detailed paragraph",
      "model": "gpt-4"
    }
  },
  "distribute": [
    {
      "plugin": "@curatedotfun/notion",
      "config": {
        "databaseId": "your-database-id",
        "properties": {
          "Name": "title",
          "Content": "content",
          "Source": "url"
        }
      }
    }
  ]
}
```

### Multi-Channel Distribution

Send the same content to multiple platforms with different formatting:

```json
{
  "distribute": [
    {
      "plugin": "@curatedotfun/telegram",
      "config": {
        "botToken": "{TELEGRAM_BOT_TOKEN}",
        "chatId": "-1001234567890",
        "format": "markdown"
      }
    },
    {
      "plugin": "@curatedotfun/near-social",
      "config": {
        "accountId": "your-near-account.near",
        "privateKey": "{NEAR_PRIVATE_KEY}"
      }
    }
  ]
}
```

### Daily Recap Generation

Create daily summaries of curated content:

```json
{
  "outputs": {
    "recap": {
      "enabled": true,
      "schedule": "0 18 * * *", // Daily at 6 PM
      "transform": {
        "plugin": "@curatedotfun/ai-transform",
        "config": {
          "prompt": "Create a summary of today's top content",
          "model": "gpt-4"
        }
      },
      "distribute": [
        {
          "plugin": "@curatedotfun/telegram",
          "config": {
            "botToken": "{TELEGRAM_BOT_TOKEN}",
            "chatId": "-1001234567890"
          }
        }
      ]
    }
  }
}
```

## 🔧 Customizing Plugin Behavior

Each plugin has specific configuration options. Here are some common customizations:

### Transformer Plugins

#### AI Transform
- **prompt**: Customize how AI enhances your content
- **model**: Choose different AI models for different needs
- **temperature**: Control creativity vs. precision

#### Simple Transform
- **template**: Define custom formatting templates
- **placeholders**: Map content fields to template variables

### Distributor Plugins

#### Telegram
- **format**: Choose between plain text, HTML, or Markdown
- **preview**: Enable/disable link previews
- **notification**: Enable/disable notification sounds

#### Notion
- **properties**: Map content fields to Notion database properties
- **icon**: Set custom icons for created pages
- **tags**: Automatically add tags to entries

#### RSS
- **itemCount**: Control how many items appear in the feed
- **customElements**: Add custom XML elements
- **cacheTime**: Set caching duration

## 💡 Tips for Effective Plugin Usage

1. **Start Simple**: Begin with a basic workflow and add complexity as needed
2. **Test Thoroughly**: Test your configuration with sample content before going live
3. **Monitor Performance**: Check how your workflows perform and adjust as needed
4. **Combine Strategically**: Different plugins work well together for specific use cases
5. **Use Environment Variables**: Store sensitive information as environment variables

## 🔍 Troubleshooting

Common issues and solutions:

| Issue | Solution |
|-------|----------|
| Content not appearing in distribution channels | Check your curator approval status and distribution plugin configuration |
| Formatting looks incorrect | Review your transformer plugin settings and template format |
| Missing environment variables | Ensure all required environment variables are set in your .env file |
| Rate limiting errors | Add delays between distributions or reduce frequency |

## 🌐 Finding More Plugins

Visit the [Plugin Directory](../plugins/index.md) to discover all available plugins and their detailed configuration options.

## 🚀 Next Steps

- [Configure your curate.fun instance](../developers/configuration.md)
- [Learn about content curation](./curation.md)
- [Explore available plugins](../plugins/index.md)
