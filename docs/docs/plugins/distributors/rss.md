---
sidebar_position: 3
---

# 📡 RSS Plugin

The RSS plugin generates RSS feeds for your curated content, making it easy to distribute content to RSS readers and feed aggregators.

## Configuration

Add the RSS plugin to your `curate.config.json`:

```json
{
  "plugins": {
    "@curatedotfun/rss": {
      "type": "distributor",
      "url": "https://plugins.curate.fun/rss/remoteEntry.js"
    }
  }
}
```

Configure the plugin in your feed:

```json
{
  "distribute": [
    {
      "plugin": "@curatedotfun/rss",
      "config": {
        "title": "My Curated Feed",
        "description": "Latest curated content from my feed",
        "feedUrl": "https://example.com/feed.xml",
        "siteUrl": "https://example.com",
        "language": "en"
      }
    }
  ]
}
```

## Configuration Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| title | string | Yes | The title of your RSS feed |
| description | string | Yes | A description of your feed |
| feedUrl | string | Yes | The URL where your feed will be accessible |
| siteUrl | string | Yes | The URL of your website |
| language | string | No | The language of your feed (default: "en") |

## Development

:::tip
Use the [Plugin Manager](https://github.com/PotLock/curatedotfun-plugins/tree/main/apps/example) to test your RSS feed configuration and preview the output.
:::

## Example Implementation

You can find the RSS plugin implementation in our [curatedotfun-plugins repository](https://github.com/PotLock/curatedotfun-plugins).
