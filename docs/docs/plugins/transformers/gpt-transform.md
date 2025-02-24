---
sidebar_position: 2
---

# 🤖 GPT Transform Plugin

The GPT Transform plugin enables AI-powered content transformation using OpenRouter's API and GPT models.

## 🔧 Setup Guide

1. Define the plugin in your `curate.config.json`:

   ```json
   {
     "plugins": {
       "@curatedotfun/gpt-transform": {
         "type": "transformer",
         "url": "./external/gpt-transform"
       }
     }
   }
   ```

2. Add the transformer to a feed's output stream or recap:

   ```json
   {
     "feeds": [
       {
         "id": "your-feed",
         "outputs": {
           "stream": {
             "enabled": true,
             "transform": {
               "plugin": "@curatedotfun/gpt-transform",
               "config": {
                 "prompt": "Your system prompt here",
                 "apiKey": "{OPENROUTER_API_KEY}"
               }
             },
             "distribute": [
               // Your distributors here
             ]
           }
         }
       }
     ]
   }
   ```

   :::info
   The `{OPENROUTER_API_KEY}` has already been configured in the deployed environment and will get injected at runtime.
   :::

### Example Configuration

Here's an example that transforms content into a news-style format:

```json
{
  "transform": {
    "plugin": "@curatedotfun/gpt-transform",
    "config": {
      "prompt": "You are a helpful assistant that summarizes content in a news-style format...",
      "apiKey": "{OPENROUTER_API_KEY}"
    }
  }
}
```
