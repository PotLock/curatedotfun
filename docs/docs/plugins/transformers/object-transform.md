---
sidebar_position: 3
---

# 🔄 Object Transform Plugin

The Object Transform plugin enables object-to-object mapping using [Mustache](https://mustache.github.io/) templates. Unlike the Simple Transform plugin which outputs a string, this plugin outputs a new object with transformed fields. It's particularly useful when you need to transform data structures before sending them to other plugins.

## 🚀 Features

- **Object-to-Object Transformation**: Create new objects with transformed fields
- **Template-based Field Values**: Use Mustache templates to format each field's value
- **Flexible Output Structure**: Define any number of output fields with custom names
- **Array Support**: Handle array fields with direct mapping and array combinations

## 📝 Usage

The plugin accepts a configuration of mappings that define how to transform the input object into a new object:

```json
{
  "plugin": "@curatedotfun/object-transform",
  "config": {
    "mappings": {
      "outputField1": "template string 1",
      "outputField2": "template string 2"
    }
  }
}
```

## 🎨 Mustache Template Syntax

Each value in the mappings object uses Mustache syntax to generate the field's value:

### Basic Variables

Use double curly braces to insert values:

```json
{
  "mappings": {
    "author": "{{firstName}} {{lastName}}",
    "handle": "@{{username}}"
  }
}
```

If input has `firstName: "John"`, `lastName: "Doe"`, `username: "johnd"`, outputs:

```json
{
  "author": "John Doe",
  "handle": "@johnd"
}
```

### Array Fields

The plugin provides special handling for array fields:

```json
{
  "mappings": {
    // Direct array mapping - preserves the array structure
    "categories": "{{tags}}",
    
    // Combine static values with arrays
    "mixedCategories": ["near", "{{tags}}"],
    
    // Multiple arrays
    "allCategories": ["web", "{{tags}}", "{{moreTags}}"]
  }
}
```

Given this input:

```json
{
  "tags": ["javascript", "typescript"],
  "moreTags": ["react", "node"]
}
```

Outputs:

```json
{
  "categories": ["javascript", "typescript"],
  "mixedCategories": ["near", "javascript", "typescript"],
  "allCategories": ["web", "javascript", "typescript", "react", "node"]
}
```

### Optional Values

Use sections to include fields conditionally:

```json
{
  "mappings": {
    "title": "{{#title}}{{.}}{{/title}}{{^title}}Untitled Post{{/title}}",
    "description": "{{#description}}{{.}}{{/description}}"
  }
}
```

- If description is missing, that field won't be included in output
- If title is missing, it defaults to "Untitled Post"

### Nested Values

Access nested properties using dot notation:

```json
{
  "mappings": {
    "authorName": "{{user.profile.name}}",
    "authorBio": "{{user.profile.bio}}"
  }
}
```

## 💡 Examples

### Database Entry Transform

Transform a tweet into a database-compatible format:

```json
{
  "transform": {
    "plugin": "@curatedotfun/object-transform",
    "config": {
      "mappings": {
        "id": "tweet-{{tweetId}}",
        "type": "social_post",
        "title": "Tweet by {{username}}",
        "url": "https://x.com/{{username}}/status/{{tweetId}}",
        "author": "{{firstName}} {{lastName}}",
        "content": "{{content}}",
        "category": "{{#category}}{{.}}{{/category}}{{^category}}Uncategorized{{/category}}",
        "engagement": "{{#metrics}}{{likes}} likes, {{retweets}} RTs{{/metrics}}",
        "notes": "{{#curator.notes}}{{.}}{{/curator.notes}}",
        "tags": ["social", "{{category}}", "{{tags}}"]
      }
    }
  }
}
```

Given this input:

```json
{
  "username": "cryptobuilder",
  "tweetId": "123456789",
  "firstName": "John",
  "lastName": "Doe",
  "content": "Just launched our new DeFi protocol!",
  "category": "DeFi",
  "tags": ["blockchain", "crypto"],
  "metrics": {
    "likes": 1500,
    "retweets": 500
  },
  "curator": {
    "notes": "Interesting launch with novel tokenomics"
  }
}
```

Outputs:

```json
{
  "id": "tweet-123456789",
  "type": "social_post",
  "title": "Tweet by cryptobuilder",
  "url": "https://x.com/cryptobuilder/status/123456789",
  "author": "John Doe",
  "content": "Just launched our new DeFi protocol!",
  "category": "DeFi",
  "engagement": "1500 likes, 500 RTs",
  "notes": "Interesting launch with novel tokenomics",
  "tags": ["social", "DeFi", "blockchain", "crypto"]
}
```

### Nested Object Transform

Transform data into a complex nested structure:

```json
{
  "transform": {
    "plugin": "@curatedotfun/object-transform",
    "config": {
      "mappings": {
        "data": {
          "id": "{{userId}}-{{postId}}",
          "type": "social_post",
          "attributes": {
            "title": "{{#title}}{{.}}{{/title}}{{^title}}Post by {{username}}{{/title}}",
            "content": "{{content}}",
            "author": {
              "name": "{{firstName}} {{lastName}}",
              "username": "{{username}}",
              "verified": "{{#verified}}true{{/verified}}{{^verified}}false{{/verified}}"
            },
            "metadata": {
              "timestamp": "{{createdAt}}",
              "platform": "twitter",
              "engagement": {
                "likes": "{{metrics.likes}}",
                "shares": "{{metrics.retweets}}"
              }
            },
            "categories": ["{{primaryCategory}}", "{{tags}}"]
          }
        }
      }
    }
  }
}
```

This example demonstrates:

- Creating complex nested objects
- Combining multiple fields into IDs
- Setting default values
- Transforming boolean flags
- Mapping nested input fields to different output structures
- Handling arrays and combining them with static values

:::tip
Use this plugin when you need to transform data structures between plugins. If you just need to format text into a string, use the Simple Transform plugin instead.
:::
