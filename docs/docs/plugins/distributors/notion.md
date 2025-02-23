---
sidebar_position: 2
---

# 📝 Notion Plugin

The Notion plugin enables distribution of content to a Notion database. It accepts any object structure and automatically formats the values based on their types to match Notion's property formats.

## 🔧 Setup Guide

1. Create a Notion integration:
   - Go to [Notion Integrations](https://www.notion.so/my-integrations)
   - Create a new integration
   - Copy the "Internal Integration Token"

2. Create and share a database:
   - Create a new database in Notion
   - Share it with your integration via the "..." menu → "Add connections"
   - Copy the database ID from the URL (the `<long_hash_1>` in `https://www.notion.so/<long_hash_1>?v=<long_hash_2>`)

## 📝 Usage with Object Transform

The Notion plugin works seamlessly with the Object Transform plugin to map your data into the desired structure. For example:

```json
{
  "transform": {
    "plugin": "@curatedotfun/object-transform",
    "config": {
      "mappings": {
        "Title": {
          "template": "{{title}} by {{author}}"
        },
        "URL": {
          "field": "url"
        },
        "Tags": {
          "field": "categories"
        },
        "Published": {
          "field": "publishDate"
        }
      }
    }
  },
  "distribute": [
    {
      "plugin": "@curatedotfun/notion",
      "config": {
        "token": "your_integration_token",
        "databaseId": "your_database_id"
      }
    }
  ]
}
```

The Notion plugin will automatically format each property based on its value type:

- **Strings** → Rich Text
- **Dates** (or date strings) → Date
- **Numbers** → Number
- **Booleans** → Checkbox
- **Arrays** → Multi-select
- **Other types** → Rich Text (converted to string)

:::tip
Design your database schema to match your transformed object structure. The plugin will create pages with properties matching your object's field names.
:::

## 📝 Configuration Reference

You need to specify:

- `token`: Notion Internal Integration Token
- `databaseId`: Your database ID extracted from the URL

```json
{
  "plugin": "@curatedotfun/notion",
  "config": {
    "token": "secret_...", // Your Notion integration token
    "databaseId": "..." // Your Notion database ID
  }
}
```
