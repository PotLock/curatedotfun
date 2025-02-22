---
sidebar_position: 2
---

# 🐦 Twitter Source Plugin

The Twitter source plugin enables content ingestion from Twitter (X) by monitoring tweets, mentions, replies, and hashtags. It provides real-time content monitoring and standardized submission processing.

## 📋 Requirements

- Twitter account credentials
- 2FA enabled for security
- API access (automatically handled through web interface)

## ⚙️ Configuration

The Twitter plugin is configured through the `sources` section in your `curate.config.json`:

```json
{
  "sources": [
    {
      "plugin": "@curatedotfun/twitter",
      "config": {
        "username": "curatedotfun",
        "monitorMentions": true,
        "monitorReplies": true,
        "monitorHashtags": ["#curatedotfun"],
        "submissionFormat": {
          "content": "{{tweet.text}}",
          "submissionId": "{{tweet.id}}",
          "username": "{{tweet.author.username}}",
          "firstName": "{{tweet.author.firstName}}",
          "lastName": "{{tweet.author.lastName}}"
        }
      }
    }
  ]
}
```

### Configuration Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| username | string | Yes | Twitter username to monitor |
| monitorMentions | boolean | No | Monitor mentions of the username |
| monitorReplies | boolean | No | Monitor replies to the username's tweets |
| monitorHashtags | string[] | No | List of hashtags to monitor |
| submissionFormat | object | Yes | Template for formatting submissions |

### Environment Variables

```bash
TWITTER_USERNAME=your_username
TWITTER_PASSWORD=your_password
TWITTER_EMAIL=your_email
TWITTER_2FA_SECRET=your_2fa_secret
```

## 🔄 Content Flow

1. **Monitoring**: The plugin monitors Twitter for:
   - Mentions of the configured username
   - Replies to the user's tweets
   - Specified hashtags
   - Direct messages (if enabled)

2. **Processing**: When content is detected:
   - Tweet metadata is extracted
   - Content is formatted according to submissionFormat
   - Submission is created and validated

3. **Submission**: Processed content enters the curation system:
   - Standardized submission format
   - Includes original tweet metadata
   - Ready for moderation

## 📝 Submission Format

The `submissionFormat` configuration uses Mustache templates to map tweet data:

```typescript
interface Tweet {
  id: string;
  text: string;
  author: {
    username: string;
    firstName?: string;
    lastName?: string;
    profileUrl: string;
  };
  metrics: {
    likes: number;
    retweets: number;
    replies: number;
  };
  media?: {
    type: string;
    url: string;
  }[];
  createdAt: string;
}
```

Available template variables:
- `{{tweet.text}}` - Tweet content
- `{{tweet.id}}` - Tweet ID
- `{{tweet.author.username}}` - Author's username
- `{{tweet.author.firstName}}` - Author's first name
- `{{tweet.author.lastName}}` - Author's last name
- `{{tweet.author.profileUrl}}` - Author's profile URL
- `{{tweet.metrics.likes}}` - Like count
- `{{tweet.metrics.retweets}}` - Retweet count
- `{{tweet.metrics.replies}}` - Reply count
- `{{tweet.createdAt}}` - Creation timestamp

## 🚀 Best Practices

1. **Rate Limiting**
   - Configure appropriate monitoring intervals
   - Use hashtag filtering wisely
   - Monitor API usage

2. **Error Handling**
   - Handle Twitter API rate limits
   - Implement exponential backoff
   - Log failed requests

3. **Content Filtering**
   - Use hashtags strategically
   - Configure content rules
   - Monitor submission quality

4. **Security**
   - Enable 2FA
   - Rotate credentials regularly
   - Monitor access patterns

## 🔍 Troubleshooting

Common issues and solutions:

1. **Rate Limiting**
   ```
   Error: Rate limit exceeded
   ```
   - Increase monitoring interval
   - Reduce hashtag count
   - Check API usage

2. **Authentication**
   ```
   Error: Authentication failed
   ```
   - Verify credentials
   - Check 2FA setup
   - Update environment variables

3. **Content Processing**
   ```
   Error: Invalid tweet format
   ```
   - Check submissionFormat
   - Verify template variables
   - Update content rules

## 📚 Examples

### Basic Monitoring
```json
{
  "sources": [{
    "plugin": "@curatedotfun/twitter",
    "config": {
      "username": "curatedotfun",
      "monitorMentions": true
    }
  }]
}
```

### Hashtag Monitoring
```json
{
  "sources": [{
    "plugin": "@curatedotfun/twitter",
    "config": {
      "username": "curatedotfun",
      "monitorHashtags": ["#web3", "#crypto", "#blockchain"]
    }
  }]
}
```

### Custom Submission Format
```json
{
  "sources": [{
    "plugin": "@curatedotfun/twitter",
    "config": {
      "username": "curatedotfun",
      "submissionFormat": {
        "content": "🐦 {{tweet.text}}\n\n📊 {{tweet.metrics.likes}} likes",
        "metadata": {
          "tweetId": "{{tweet.id}}",
          "author": "{{tweet.author.username}}",
          "metrics": {
            "likes": "{{tweet.metrics.likes}}",
            "retweets": "{{tweet.metrics.retweets}}"
          }
        }
      }
    }
  }]
}
```

