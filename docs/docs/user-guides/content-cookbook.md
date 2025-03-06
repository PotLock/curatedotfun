---
sidebar_position: 3
---

# 👨‍🍳 Content Cookbook

Ready-to-use recipes for common content curation workflows using curate.fun plugins ⚡

## 📚 Introduction

This cookbook provides tested plugin combinations ("recipes") that you can copy and adapt for your own curation needs. Each recipe includes:

- A description of what the workflow accomplishes
- The complete configuration code
- Explanations of key components
- Tips for customization

## 🧩 Recipe Structure

Most recipes follow this general pattern:

1. **Source Data**: The original content from platforms like Twitter
2. **Data Mapping**: Extracting and structuring relevant information
3. **Content Enhancement**: Improving content with AI or other transformations
4. **Channel Formatting**: Preparing content for specific platforms
5. **Distribution**: Sending the formatted content to destination channels

The workflow follows a linear path: Source Data → Data Mapping → Content Enhancement → Channel Formatting → Distribution

## 🔥 Popular Recipes

### AI-Enhanced News Flash

This recipe takes tweets and transforms them into professional news flashes with AI-generated titles and summaries.

```json
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
      "prompt": "Summarize the content into a concise news flash, incorporating relevant details from the curator's notes. Maintain a neutral, third-person tone.",
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
          "template": "🔷 {{feedName}}: *{{title}}*\n\n{{summary}}\n\n👤 Source [@{{author}}](https://x.com/{{author}})_\n🔗 [Read More](<{{source}}>)"
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
```

**Key Components:**
- **Object Transform**: Maps tweet data into a structured format
- **AI Transform**: Generates a title and summary using AI
- **Simple Transform**: Formats the content for Telegram with emojis and markdown
- **Telegram Distribution**: Sends the formatted content to a Telegram channel

**Customization Tips:**
- Adjust the AI prompt to match your content style
- Modify the template to include different emojis or formatting
- Add additional distribution channels with their own formatting

### Multi-Platform Distribution

This recipe distributes the same content to multiple platforms with platform-specific formatting.

```json
"distribute": [
  {
    "transform": [
      {
        "plugin": "@curatedotfun/simple-transform",
        "config": {
          "template": "🚢 {{feedName}}: *{{title}}*\n\n{{summary}}\n\n👤 Source [@{{author}}](https://x.com/{{author}})_\n🔗 [Read More](<{{source}}>)"
        }
      }
    ],
    "plugin": "@curatedotfun/telegram",
    "config": {
      "botToken": "{TELEGRAM_BOT_TOKEN}",
      "channelId": "-1001941128087",
      "messageThreadId": "11535"
    }
  },
  {
    "transform": [
      {
        "plugin": "@curatedotfun/simple-transform",
        "config": {
          "template": "🚢 {{feedName}}: *{{title}}*\n\n{{summary}}\n\n👤 Source [@{{author}}](https://x.com/{{author}})_\n🔗 [Read More](<{{source}}>)"
        }
      }
    ],
    "plugin": "@curatedotfun/near-social",
    "config": {
      "accountId": "your-account.near",
      "privateKey": "{NEAR_PRIVATE_KEY}",
      "networkId": "mainnet"
    }
  },
  {
    "transform": [
      {
        "plugin": "@curatedotfun/object-transform",
        "config": {
          "mappings": {
            "title": "{{title}}",
            "content": "<h2>{{title}}</h2><p>{{summary}}</p>",
            "description": "{{summary}}",
            "link": "{{source}}",
            "publishedAt": "{{createdAt}}",
            "author": {
              "name": "{{username}}",
              "link": "https://x.com/{{author}}"
            },
            "categories": ["{{feedName}}", "{{tags}}"],
            "source": {
              "url": "{{source}}",
              "title": "twitter"
            }
          }
        }
      }
    ],
    "plugin": "@curatedotfun/rss",
    "config": {
      "serviceUrl": "http://localhost:4001",
      "apiSecret": "{API_SECRET}"
    }
  }
]
```

**Key Components:**
- **Simple Transform**: Creates human-readable content for social platforms
- **Object Transform**: Maps data to RSS-specific format
- **Multiple Distribution Plugins**: Sends to Telegram, NEAR Social, and RSS

**Customization Tips:**
- Add or remove distribution channels as needed
- Customize each channel's formatting independently
- Use different templates for different platforms

### Notion Database Integration

This recipe sends curated content to a Notion database with structured properties.

```json
"distribute": [
  {
    "transform": [
      {
        "plugin": "@curatedotfun/object-transform",
        "config": {
          "mappings": {
            "tweetId": "{{title}}",
            "userId": "{{source}}",
            "submittedAt": "{{submittedAt}}"
          }
        }
      }
    ],
    "plugin": "@curatedotfun/notion",
    "config": {
      "token": "{NOTION_TOKEN}",
      "databaseId": "your-database-id",
      "aiToken": "{OPENROUTER_API_KEY}"
    }
  }
]
```

**Key Components:**
- **Object Transform**: Maps content to Notion database properties
- **Notion Plugin**: Integrates with a Notion database

**Customization Tips:**
- Adjust mappings to match your Notion database structure
- Add additional properties like tags, categories, or status

## 🔄 Transformation Chains

### Two-Step AI Processing

This recipe shows how to chain multiple AI transformations for more sophisticated content processing.

```json
"transform": [
  {
    "plugin": "@curatedotfun/object-transform",
    "config": {
      "mappings": {
        "rawContent": "{{content}}",
        "curatorNotes": "{{curator.notes}}"
      }
    }
  },
  {
    "plugin": "@curatedotfun/ai-transform",
    "config": {
      "prompt": "Extract the key facts from this content.",
      "apiKey": "{OPENROUTER_API_KEY}",
      "schema": {
        "keyFacts": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "List of key facts from the content"
        }
      }
    }
  },
  {
    "plugin": "@curatedotfun/ai-transform",
    "config": {
      "prompt": "Create a news article based on these key facts and curator notes.",
      "apiKey": "{OPENROUTER_API_KEY}",
      "schema": {
        "title": {
          "type": "string",
          "description": "Article title"
        },
        "article": {
          "type": "string",
          "description": "Full article text"
        }
      }
    }
  }
]
```

**Key Components:**
- **Initial Data Mapping**: Prepares raw content
- **First AI Pass**: Extracts key facts
- **Second AI Pass**: Creates a complete article

**Customization Tips:**
- Adjust prompts for different content types
- Modify the schema to extract different information
- Add more transformation steps for complex workflows

## 📊 Feed-Specific Recipes

### Crypto News Feed

This recipe is optimized for cryptocurrency news curation.

```json
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
      "prompt": "Summarize this cryptocurrency news into a concise update. Include any price information, project developments, or market trends mentioned.",
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
          "template": "💰 Crypto: *{{title}}*\n\n{{summary}}\n\n👤 Source [@{{author}}](https://x.com/{{author}})_\n🔗 [Read More](<{{source}}>)"
        }
      }
    ],
    "plugin": "@curatedotfun/telegram",
    "config": {
      "botToken": "{TELEGRAM_BOT_TOKEN}",
      "channelId": "@cryptonews"
    }
  }
]
```

### Tech Updates Feed

This recipe is designed for technology news and updates.

```json
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
      "prompt": "Summarize this technology news into a concise update. Focus on innovations, product launches, or industry trends.",
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
          "template": "🤖 Tech: *{{title}}*\n\n{{summary}}\n\n👤 Source [@{{author}}](https://x.com/{{author}})_\n🔗 [Read More](<{{source}}>)"
        }
      }
    ],
    "plugin": "@curatedotfun/telegram",
    "config": {
      "botToken": "{TELEGRAM_BOT_TOKEN}",
      "channelId": "@technews"
    }
  }
]
```

## 📅 Scheduled Content Recipes

### Daily Recap

This recipe generates a daily summary of all curated content.

```json
"outputs": {
  "recap": {
    "enabled": true,
    "schedule": "0 18 * * *", // Daily at 6 PM
    "transform": [
      {
        "plugin": "@curatedotfun/ai-transform",
        "config": {
          "prompt": "Create a summary of today's top content, organizing it by topic and highlighting the most important developments.",
          "apiKey": "{OPENROUTER_API_KEY}",
          "schema": {
            "title": {
              "type": "string",
              "description": "Recap title"
            },
            "summary": {
              "type": "string",
              "description": "Full recap text"
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
              "template": "📅 Daily Recap: *{{title}}*\n\n{{summary}}"
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
```

## 🔧 Advanced Techniques

### Conditional Transformations

While curate.fun doesn't directly support conditional logic, you can achieve similar results by using the AI transform plugin with specific prompts:

```json
"plugin": "@curatedotfun/ai-transform",
"config": {
  "prompt": "If the content mentions a product launch, focus on the product features. If it mentions funding, focus on the investment details. Otherwise, provide a general summary.",
  "apiKey": "{OPENROUTER_API_KEY}"
}
```

### Content Categorization

Use AI to automatically categorize content:

```json
"plugin": "@curatedotfun/ai-transform",
"config": {
  "prompt": "Analyze this content and categorize it.",
  "apiKey": "{OPENROUTER_API_KEY}",
  "schema": {
    "category": {
      "type": "string",
      "enum": ["News", "Tutorial", "Opinion", "Announcement", "Other"],
      "description": "Content category"
    },
    "tags": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Relevant tags"
    }
  }
}
```

## 🚀 Contributing Recipes

Have a great recipe to share? We'd love to add it to the cookbook! Submit your recipes to the [curate.fun GitHub repository](https://github.com/PotLock/curatedotfun).

## 🔍 Next Steps

- [Learn the basics of using plugins](./using-plugins.md)
- [Understand content curation](./curation.md)
- [Explore available plugins](../plugins/index.md)
