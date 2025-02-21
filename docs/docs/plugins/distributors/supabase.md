---
sidebar_position: 4
---

# 💾 Supabase Plugin

The Supabase plugin enables you to store and manage curated content in your Supabase database, providing a flexible storage solution for your content.

## Configuration

Add the Supabase plugin to your `curate.config.json`:

```json
{
  "plugins": {
    "@curatedotfun/supabase": {
      "type": "distributor",
      "url": "https://plugins.curate.fun/supabase/remoteEntry.js"
    }
  }
}
```

Configure the plugin in your feed:

```json
{
  "distribute": [
    {
      "plugin": "@curatedotfun/supabase",
      "config": {
        "url": "{SUPABASE_URL}",
        "key": "{SUPABASE_KEY}",
        "table": "curated_content",
        "schema": {
          "title": "string",
          "content": "string",
          "source_url": "string",
          "curator": "string",
          "timestamp": "timestamp"
        }
      }
    }
  ]
}
```

## Configuration Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| url | string | Yes | Your Supabase project URL |
| key | string | Yes | Your Supabase API key |
| table | string | Yes | The table name to store content in |
| schema | object | No | Custom schema mapping for your table |

:::note Environment Variables
The Supabase URL and key should be provided through environment variables:
- SUPABASE_URL: Your Supabase project URL
- SUPABASE_KEY: Your Supabase API key

Add these to your `.env` file during development with the Plugin Manager.
:::

## Schema Configuration

The schema configuration allows you to map content fields to your database columns. Default schema:

```json
{
  "schema": {
    "title": "string",
    "content": "string",
    "source_url": "string",
    "curator": "string",
    "timestamp": "timestamp"
  }
}
```

You can customize this schema to match your table structure.

## Development

:::tip
Use the [Plugin Manager](https://github.com/PotLock/curatedotfun-plugins/tree/main/apps/example) to test your Supabase configuration and verify data storage.
:::

## Example Implementation

You can find the Supabase plugin implementation in our [curatedotfun-plugins repository](https://github.com/PotLock/curatedotfun-plugins).
