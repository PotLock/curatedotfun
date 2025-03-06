---
sidebar_position: 4
---

# 💾 Supabase Plugin

The Supabase plugin enables you to store and manage curated content in your Supabase database, providing a flexible storage solution for your content curation workflow.

## 🔧 Setup Guide

1. Create a Supabase project at [supabase.com](https://supabase.com) if you don't already have one.

2. Create a table in your Supabase database to store the curated content. You can use the SQL editor in the Supabase dashboard:

   ```sql
   CREATE TABLE curated_content (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     title TEXT,
     content TEXT NOT NULL,
     source_url TEXT,
     curator TEXT,
     timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     metadata JSONB
   );
   ```

   :::note
   You can customize this table structure to match your specific needs. The plugin will map content to your table structure based on the schema configuration.
   :::

3. Get your Supabase URL and API key from the Supabase dashboard under Project Settings > API.

4. Modify your `curate.config.json` to include the Supabase configuration:

   ```json
   {
     "outputs": {
       "stream": {
         "enabled": true,
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
                 "timestamp": "timestamp",
                 "metadata": "json"
               },
               "createTableIfNotExists": false
             }
           }
         ]
       }
     }
   }
   ```

   The container is already set up to hydrate environment variables into the configuration at runtime, replacing `{SUPABASE_URL}` and `{SUPABASE_KEY}` with the values from the environment.

   You need to specify:
   - `url`: Your Supabase project URL
   - `key`: Your Supabase API key
   - `table`: The name of the table to store content in
   - `schema`: (Optional) Custom schema mapping for your table
   - `createTableIfNotExists`: (Optional) Whether to create the table if it doesn't exist

   :::caution
   Keep your Supabase API key secure! Never commit it directly to your configuration files or repositories.
   :::

5. Enable the stream by setting `"enabled": true` if not already enabled.

   Once merged, your approved messages will start flowing to your Supabase database.

## 📝 Configuration Reference

Full configuration options for the Supabase plugin:

```json
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
      "timestamp": "timestamp",
      "metadata": "json"
    },
    "createTableIfNotExists": false,
    "upsertMode": false,
    "upsertConstraint": "source_url"
  }
}
```

### Configuration Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| url | string | Yes | - | Your Supabase project URL |
| key | string | Yes | - | Your Supabase API key |
| table | string | Yes | - | The table name to store content in |
| schema | object | No | See below | Custom schema mapping for your table |
| createTableIfNotExists | boolean | No | false | Whether to create the table if it doesn't exist |
| upsertMode | boolean | No | false | Whether to use upsert instead of insert |
| upsertConstraint | string | No | - | Column name to use as constraint for upsert |

### Default Schema

If no schema is provided, the plugin uses this default schema:

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

### Supported Data Types

The schema configuration supports these data types:

- `string`: Text data
- `number`: Numeric data
- `boolean`: Boolean data
- `timestamp`: Date and time data
- `json`: JSON data (stored as JSONB in Supabase)

## 🔄 Data Transformation

The Supabase plugin accepts structured input data that maps to your database schema. You can use transformer plugins to format your data before sending it to Supabase.

### Using Transformer Plugins

To format your data properly for Supabase, you can use transformer plugins like `@curatedotfun/ai-transform` and `@curatedotfun/object-transform` before the Supabase plugin.

#### Example Transformation Pipeline

```json
{
  "outputs": {
    "stream": {
      "enabled": true,
      "transform": [
        {
          "plugin": "@curatedotfun/ai-transform",
          "config": {
            "prompt": "Transform this content into a structured article with title and summary.",
            "apiKey": "{OPENROUTER_API_KEY}",
            "schema": {
              "title": {
                "type": "string",
                "description": "Title for the article"
              },
              "summary": {
                "type": "string",
                "description": "Summary of the article"
              },
              "tags": {
                "type": "array",
                "items": {
                  "type": "string"
                },
                "description": "Relevant tags for the content"
              }
            }
          }
        },
        {
          "plugin": "@curatedotfun/object-transform",
          "config": {
            "mappings": {
              "title": "{{title}}",
              "content": "{{summary}}",
              "source_url": "{{sourceUrl}}",
              "curator": "{{curatorName}}",
              "timestamp": "{{timestamp}}",
              "metadata": {
                "tags": "{{tags}}",
                "original_content": "{{originalContent}}",
                "submission_id": "{{submissionId}}"
              }
            }
          }
        }
      ],
      "distribute": [
        {
          "plugin": "@curatedotfun/supabase",
          "config": {
            "url": "{SUPABASE_URL}",
            "key": "{SUPABASE_KEY}",
            "table": "curated_content"
          }
        }
      ]
    }
  }
}
```

This example demonstrates a transformation pipeline that:

1. First uses AI transformation to generate a title, summary, and tags from the input content
2. Then uses object transformation to map the AI-generated content to your Supabase table schema

## 🔐 Security Considerations

- The Supabase plugin requires an API key to authenticate with your Supabase project. This key should be stored securely as an environment variable.
- Consider using Row Level Security (RLS) in your Supabase database to control access to your data.
- Use the least privileged API key possible for your use case.
- Monitor your Supabase project's activity regularly to ensure it's being used as expected.

## 🛠️ Development and Testing

During development, you can use the Plugin Manager to test your Supabase configuration:

1. Start the Plugin Manager:
```bash
git clone https://github.com/PotLock/curatedotfun-plugins.git
cd curatedotfun-plugins
bun install
bun run start
```

2. Add your Supabase credentials to the `.env` file:
```
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-key
```

3. Test the plugin with sample data to verify it correctly stores data in your Supabase database.

:::tip
You can use the Supabase dashboard to view the stored data and verify it's being inserted correctly.
:::

## 📚 Advanced Usage

### Upsert Mode

If you want to update existing records instead of creating new ones when a record with the same constraint already exists, you can use upsert mode:

```json
{
  "plugin": "@curatedotfun/supabase",
  "config": {
    "url": "{SUPABASE_URL}",
    "key": "{SUPABASE_KEY}",
    "table": "curated_content",
    "upsertMode": true,
    "upsertConstraint": "source_url"
  }
}
```

This will update existing records that have the same `source_url` value, or insert new records if no match is found.

### Custom Table Creation

If you enable `createTableIfNotExists`, the plugin will create a table with your schema if it doesn't already exist:

```json
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
      "timestamp": "timestamp",
      "metadata": "json"
    },
    "createTableIfNotExists": true
  }
}
```

:::caution
This feature requires the API key to have permission to create tables in your Supabase project.
:::
