---
sidebar_position: 4
---

# 🤖 AI Transform Plugin

The AI Transform plugin enables AI-powered content transformation using OpenRouter's API and models, supporting both free-form text and structured JSON outputs.

## 🔧 Setup Guide

1. Define the plugin in your `curate.config.json`:

   ```json
   {
     "plugins": {
       "@curatedotfun/ai-transform": {
         "type": "transformer",
         "url": "https://unpkg.com/@curatedotfun/ai-transform@latest/dist/remoteEntry.js"
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
               "plugin": "@curatedotfun/ai-transform",
               "config": {
                 "prompt": "Your system prompt here",
                 "apiKey": "{OPENROUTER_API_KEY}",
                 // Optional: Specify model (defaults to GPT-3.5-turbo)
                 "model": "openai/gpt-4",
                 // Optional: Set temperature (defaults to 0.7)
                 "temperature": 0.5,
                 // Optional: Enable structured JSON output
                 "schema": {
                   "title": {
                     "type": "string",
                     "description": "The title of the article"
                   },
                   "summary": {
                     "type": "string",
                     "description": "A brief summary of the article content"
                   },
                   "sentiment": {
                     "type": "string",
                     "description": "The overall sentiment (positive, neutral, or negative)"
                   }
                 }
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

## Features

### Configuration Options

- `prompt` (required): System prompt for the AI model
- `apiKey` (required): OpenRouter API key
- `model` (optional): Model to use (defaults to GPT-3.5-turbo, or GPT-4 for structured outputs)
- `temperature` (optional): Controls randomness in responses (0-1, defaults to 0.7)
- `schema` (optional): Schema for structured JSON output

### Model Selection

- Default model: GPT-3.5-turbo for regular text outputs
- Automatically uses GPT-4 when structured output is requested
- Can be overridden using the `model` config option

### Output Formats

#### 1. Free-form Text (Default)

```json
{
  "transform": {
    "plugin": "@curatedotfun/ai-transform",
    "config": {
      "prompt": "You are a helpful assistant that summarizes content in a news-style format...",
      "apiKey": "{OPENROUTER_API_KEY}",
      "temperature": 0.3  // Optional: Lower temperature for more focused outputs
    }
  }
}
```

#### 2. Structured JSON Output

```json
{
  "transform": {
    "plugin": "@curatedotfun/ai-transform",
    "config": {
      "prompt": "You are a helpful assistant that extracts weather information...",
      "apiKey": "{OPENROUTER_API_KEY}",
      "temperature": 0.2,  // Optional: Lower temperature for more consistent outputs
      "schema": {
        "location": {
          "type": "string",
          "description": "City or location name"
        },
        "temperature": {
          "type": "number",
          "description": "Temperature in Celsius"
        },
        "conditions": {
          "type": "string",
          "description": "Current weather conditions"
        }
      }
    }
  }
}
```

:::tip
When using structured output:

- Simply define your schema properties with types and descriptions
- The plugin handles all the JSON schema configuration internally
- All properties are automatically required
- No additional properties are allowed in the response
- Automatically uses GPT-4 for structured outputs
- Consider using a lower temperature (e.g., 0.2) for more consistent structured outputs

:::

## Model Support for Structured Outputs

Structured outputs (JSON schema responses) are supported by:

- OpenAI models (GPT-4 and later versions)
- All Fireworks provided models

To ensure compatibility:

1. Either let the plugin automatically select GPT-4 when using structured outputs
2. Or manually specify a compatible model using the `model` config option
