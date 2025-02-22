---
sidebar_position: 1
---

# 🔄 Transformation System

The transformation system enables flexible content processing through a pipeline of transformer plugins. Each transformer can modify, enhance, or restructure content as it flows through the system.

## 🏗️ Architecture

### Transform Pipeline

Content flows through three possible transformation stages:

1. **Global Stream Transforms**: Applied to all content in a feed's stream
2. **Per-Distributor Transforms**: Applied to content for specific distributors
3. **Recap Transforms**: Applied to content in scheduled recaps

Each stage can have multiple transforms that are applied in sequence, with the output of one transform becoming the input for the next.

### Configuration Placement

Transforms can be configured in three locations in your `curate.config.json`:

```json
{
  "feeds": [{
    "outputs": {
      "stream": {
        "transform": [
          // Global stream transforms
          // Applied to all content in this feed's stream
        ],
        "distribute": [{
          "transform": [
            // Per-distributor transforms
            // Applied only to content going to this distributor
          ]
        }]
      },
      "recap": {
        "transform": [
          // Recap transforms
          // Applied to content in scheduled recaps
        ]
      }
    }
  }]
}
```

## 💡 Example Configuration

Here's a complete example showing different transform placements:

```json
{
  "feeds": [{
    "outputs": {
      "stream": {
        "transform": [
          {
            "plugin": "@curatedotfun/object-transform",
            "config": {
              "mappings": {
                "source": "https://x.com/{{username}}/status/{{submissionId}}",
                "text": "{{content}}",
                "author": "{{firstName}} {{lastName}}",
                "notes": "{{#curator.notes}}{{.}}{{/curator.notes}}"
              }
            }
          }
        ],
        "distribute": [
          {
            "plugin": "@curatedotfun/telegram",
            "config": {
              "channelId": "@mychannel"
            },
            "transform": [
              {
                "plugin": "@curatedotfun/simple-transform",
                "config": {
                  "template": "🔥 {{text}}\n\n{{#notes}}📝 {{.}}{{/notes}}\n\n👤 {{author}}\n\n🔗 {{source}}"
                }
              }
            ]
          },
          {
            "plugin": "@curatedotfun/telegram",
            "config": {
              "channelId": "@mychannel_ai"
            },
            "transform": [
              {
                "plugin": "@curatedotfun/ai-transform",
                "config": {
                  "prompt": "Summarize this content with a title and key points",
                  "schema": {
                    "title": {
                      "type": "string",
                      "description": "A catchy headline summarizing the content"
                    },
                    "points": {
                      "type": "string",
                      "description": "3-5 key points from the content, one per line"
                    },
                    "category": {
                      "type": "string",
                      "description": "The inferred topic category (e.g., DeFi, NFTs, Layer2)"
                    },
                    "sentiment": {
                      "type": "string",
                      "description": "The overall sentiment (positive, neutral, or negative)"
                    }
                  },
                  "outputFormat": "json"
                }
              },
              {
                "plugin": "@curatedotfun/simple-transform",
                "config": {
                  "template": "📢 {{title}}\n\n{{points}}\n\n🏷️ {{category}} ({{sentiment}})\n\n🔗 {{source}}"
                }
              }
            ]
          }
        ]
      }
    }
  }]
}
```

In this example:

1. The global transform creates a standardized object with source URL, text, author, and notes
2. One distributor formats this directly into a Telegram message
3. Another distributor first uses AI to generate a structured summary (with a defined schema), then formats that into a message

## 🔌 Available Transformers

- [Simple Transform](./simple-transform.md) - String-based formatting using templates
- [Object Transform](./object-transform.md) - Object-to-object mapping using templates
- [AI Transform](./ai-transform.md) - Content enhancement using AI

## 🔒 Type Safety

Transformers use TypeScript generics to ensure type safety between transforms:

```typescript
interface TransformerPlugin<TInput, TOutput, TConfig> {
  transform(args: { input: TInput, config: TConfig }): Promise<TOutput>;
}
```

When chaining transforms, ensure the output type of one transform matches the input type expected by the next transform in the chain.

## 🚀 Best Practices

1. **Use Global Transforms** for standardizing data structure across all distributors
2. **Use Per-Distributor Transforms** for format-specific requirements
3. **Chain Transforms** to break down complex transformations into manageable steps
4. **Consider Type Safety** when designing transform chains
5. **Document Input/Output Types** for custom transformers

:::tip
Start with a global transform to create a consistent data structure, then use per-distributor transforms to format that data for specific outputs.
:::
