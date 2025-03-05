---
sidebar_position: 3
---

# 📰 RSS Plugin

The RSS plugin enables distribution of curated content to RSS feeds, allowing you to publish content to your own RSS feed that can be consumed by RSS readers and other applications. This extends the reach of your curated content beyond the curate.fun platform itself.

## 🚀 Features

- **Multiple Feed Formats**: Generate RSS 2.0, Atom, and JSON Feed formats
- **Standard-Compliant URLs**: Access feeds via standard paths (`/rss.xml`, `/atom.xml`, `/feed.json`) or API route `/api/items`
- **Raw Data Option**: Get content without HTML via `/raw.json` for frontend customization
- **HTML Sanitization**: Secure content handling with sanitize-html
- **Flexible Deployment**: Deploy the RSS service to various platforms (Vercel, Netlify, Heroku, Cloudflare)
- **Secure Authentication**: Simple API secret authentication for feed management
- **Redis Storage**: Efficient storage with Upstash Redis (production) or Redis mock (development)

## 🔧 Setup Guide

1. Deploy the RSS service to your preferred hosting platform. You can use the [RSS Service Template repository](https://github.com/PotLock/rss-service-template) which provides a ready-to-deploy RSS service with multiple deployment options.

2. Generate a secure random string to use as your API secret. This will be shared between your application and the RSS service.

   :::note
   The API secret is used to authenticate requests to the RSS service. Make sure to keep it secure.
   :::

3. Modify your `curate.config.json` to include the RSS configuration:

   ```json
   {
     "outputs": {
       "stream": {
         "enabled": true,
         "distribute": [
           {
             "plugin": "@curatedotfun/rss",
             "config": {
               "serviceUrl": "https://your-rss-service-url.com",
               "apiSecret": "{API_SECRET}"
             }
           }
         ]
       }
     }
   }
   ```

   The container is already set up to hydrate environment variables into the configuration at runtime, replacing `{API_SECRET}` with the values from the environment.

   You need to specify:
   - `serviceUrl`: The URL of your deployed RSS service
   - `apiSecret`: API secret for authentication with the RSS service

   :::caution
   Keep your API secret secure! Never commit it directly to your configuration files or repositories.
   :::

4. Enable the stream by setting `"enabled": true` if not already enabled.

   Once merged, your approved messages will start flowing to your RSS feed through the configured service.

## 📝 Configuration Reference

Full configuration options for the RSS plugin:

```json
{
  "plugin": "@curatedotfun/rss",
  "config": {
    "serviceUrl": "https://your-rss-service-url.com", // URL of your deployed RSS service
    "apiSecret": "{API_SECRET}" // Automatically injected from environment
  }
}
```

## 🔄 Data Transformation

The RSS plugin accepts structured input data that maps to RSS item fields. You can provide as much or as little data as you want, and the plugin will fill in defaults for missing fields.

### Input Data Structure

The plugin validates input using Zod and expects an object with these fields (content and link are required, others are optional):

```typescript
interface RssInput {
  // Core fields
  title?: string;                // Optional custom title
  content: string;               // Required - Content of the item
  description?: string;          // Optional description/summary
  link: string;                  // Required - URL to the item
  publishedAt?: string;          // Default: new Date().toISOString()
  guid?: string;                 // Default: `item-${Date.now()}`
  
  // Author information
  author?: {
    name: string;
    email?: string;
    link?: string;
  } | Array<{
    name: string;
    email?: string;
    link?: string;
  }>;
  
  // Media and categorization
  image?: string | {
    url: string;
    type?: string;
    length?: number;
  };
  audio?: string | {
    url: string;
    type?: string;
    length?: number;
  };
  video?: string | {
    url: string;
    type?: string;
    length?: number;
  };
  enclosure?: {
    url: string;
    type?: string;
    length?: number;
  };
  categories?: string[] | Array<{
    name: string;
    domain?: string;
  }>;
  
  // Additional metadata
  copyright?: string;
  source?: {
    url: string;
    title: string;
  };
  isPermaLink?: boolean;
}
```

The plugin handles various formats for fields like `author`, `image`, `audio`, `video`, and `categories`, allowing for both simple string values and more complex objects with additional metadata.

### Using Transformer Plugins

To format your data properly for RSS, you can use transformer plugins like `@curatedotfun/ai-transform` and `@curatedotfun/object-transform` before the RSS plugin. The recommended pattern is to use AI transformation first to generate content, then use object transformation to map the AI-generated content to the RSS item schema.

#### Recommended Transformation Pipeline

```json
{
  "outputs": {
    "stream": {
      "enabled": true,
      "transform": [
        {
          "plugin": "@curatedotfun/ai-transform",
          "config": {
            "prompt": "Summarize the content into a concise news flash, incorporating relevant details from the curator's notes. Maintain a neutral, third-person tone. Mention the author if relevant, or simply convey the information.",
            "apiKey": "{OPENROUTER_API_KEY}",
            "schema": {
              "title": {
                "type": "string",
                "description": "Title derived from summary of content"
              },
              "summary": {
                "type": "string",
                "description": "Summary of content influenced by curator notes"
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
              "content": "<h2>{{title}}</h2><p>{{summary}}</p>",
              "description": "{{summary}}",
              "link": "https://example.com/posts/{{id}}",
              "publishedAt": "{{publishedAt}}",
              "guid": "post-{{id}}",
              "author": {
                "name": "{{author.name}}",
                "email": "{{author.email}}",
                "link": "{{author.url}}"
              },
              "image": {
                "url": "{{image.url}}",
                "type": "{{image.type}}",
                "length": "{{image.size}}"
              },
              "audio": "{{audio.url}}",
              "video": {
                "url": "{{video.url}}",
                "type": "{{video.type}}",
                "length": "{{video.size}}"
              },
              "categories": ["{{tags}}", "news", "updates"],
              "copyright": "© {{currentYear}} Example Company",
              "source": {
                "url": "{{sourceUrl}}",
                "title": "{{sourceTitle}}"
              },
              "isPermaLink": true
            }
          }
        }
      ],
      "distribute": [
        {
          "plugin": "@curatedotfun/rss",
          "config": {
            "serviceUrl": "http://localhost:4001",
            "apiSecret": "{API_SECRET}"
          }
        }
      ]
    }
  }
}
```

This example demonstrates a complete transformation pipeline that:

1. First uses AI transformation to generate a title, summary, and tags from the input content
2. Then uses object transformation to map the AI-generated content to all available RSS item fields:
   - Core fields: title, content, description, link, publishedAt, guid
   - Author information: name, email, link
   - Media: image, audio, video
   - Categories: tags from AI plus additional static categories
   - Additional metadata: copyright, source, isPermaLink

#### Simplified Example

For a simpler implementation, you can use just the essential fields:

```json
{
  "outputs": {
    "stream": {
      "enabled": true,
      "transform": [
        {
          "plugin": "@curatedotfun/ai-transform",
          "config": {
            "prompt": "Transform this into an engaging news article with a title and content.",
            "apiKey": "{OPENROUTER_API_KEY}",
            "schema": {
              "title": {
                "type": "string",
                "description": "Engaging title for the article"
              },
              "content": {
                "type": "string",
                "description": "Article content in HTML format"
              }
            }
          }
        },
        {
          "plugin": "@curatedotfun/object-transform",
          "config": {
            "mappings": {
              "title": "{{title}}",
              "content": "{{content}}",
              "link": "https://example.com/posts/{{id}}",
              "publishedAt": "{{timestamp}}",
              "guid": "post-{{id}}"
            }
          }
        }
      ],
      "distribute": [
        {
          "plugin": "@curatedotfun/rss",
          "config": {
            "serviceUrl": "http://localhost:4001",
            "apiSecret": "{API_SECRET}"
          }
        }
      ]
    }
  }
}
```

This creates a basic RSS item with just the essential fields: title, content, link, publication date, and a unique identifier.

## 🔐 Security Considerations

- The RSS plugin requires an API secret to authenticate with the RSS service. This secret should be stored securely as an environment variable.
- Consider restricting access to your RSS service by configuring the ALLOWED_ORIGINS environment variable.
- Monitor your RSS service's activity regularly to ensure it's being used as expected.

## 📡 Accessing Your RSS Feed

Once your RSS service is deployed and the plugin is configured, your RSS feed will be available in multiple formats:

```txt
https://your-rss-service-url.com/rss.xml   # RSS 2.0 format
https://your-rss-service-url.com/atom.xml  # Atom format
https://your-rss-service-url.com/feed.json # JSON Feed format (HTML)
https://your-rss-service-url.com/raw.json  # Raw JSON format (No HTML)
```

You can share these URLs with users who want to subscribe to your feed using their favorite RSS reader.
