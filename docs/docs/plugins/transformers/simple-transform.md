---
sidebar_position: 2
---

# 📝 Simple Transform Plugin

The Simple Transform plugin provides basic text transformation using a template-based approach with placeholders.

## 🔧 Setup Guide

1. Define the plugin in your `curate.config.json`:

   ```json
   {
     "plugins": {
       "@curatedotfun/simple-transform": {
         "type": "transformer",
         "url": "./external/simple-transform"
       }
     }
   }
   ```

2. Add the transformer to a feed's output stream:

   ```json
   {
     "feeds": [
       {
         "id": "your-feed",
         "outputs": {
           "stream": {
             "enabled": true,
             "transform": {
               "plugin": "@curatedotfun/simple-transform",
               "config": {
                 "format": "📝 {CONTENT}\nCurated by @{CURATOR}"
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

### Available Placeholders

The format string supports the following placeholders:

- `{CONTENT}`: The original content
- `{CURATOR}`: The curator's username
- `{CURATOR_NOTES}`: Any notes added by the curator
- `{SUBMISSION_ID}`: The submission ID

### Example Configuration

Here's a real example from the cryptofundraise feed:

```json
{
  "transform": {
    "plugin": "@curatedotfun/simple-transform",
    "config": {
      "format": "📝 new fundraising announcement, curated by *{CURATOR}*\n{CONTENT}\n📌 source: [View Post](https://x.com/x/status/{SUBMISSION_ID})"
    }
  }
}
