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

## 🔄 Transform Flow

The transformation process follows a sequential flow:

1. **Content Input**: The original content enters the transformation system
2. **Global Transform**: Content passes through global transforms that apply to all content in a feed
3. **Per-Distributor Transform**: Content is then processed by distributor-specific transforms
4. **Final Output**: The fully transformed content is ready for distribution

This sequential approach allows for both general standardization and platform-specific formatting.

## 📚 Example Transform Chain

Here's an example of chaining transforms to process content:

1. First, use Object Transform to standardize the data structure:

```json
{
  "plugin": "@curatedotfun/object-transform",
  "config": {
    "mappings": {
      "title": "{{content|truncate:100}}",
      "text": "{{content}}",
      "author": "{{firstName}} {{lastName}}",
      "source": "https://x.com/{{username}}/status/{{submissionId}}"
    }
  }
}
```

2. Then, use AI Transform to enhance the content:

```json
{
  "plugin": "@curatedotfun/ai-transform",
  "config": {
    "prompt": "Analyze and enhance the content...",
    "schema": {
      "title": {
        "type": "string",
        "description": "An engaging title"
      },
      "summary": {
        "type": "string",
        "description": "A concise summary"
      }
    }
  }
}
```

3. Finally, use Simple Transform to format for distribution:

```json
{
  "plugin": "@curatedotfun/simple-transform",
  "config": {
    "template": "📢 {{title}}\n\n{{summary}}\n\n👤 {{author}}\n🔗 {{source}}"
  }
}
```

This chain:

1. Standardizes the data structure
2. Enhances the content with AI
3. Formats it for final distribution
