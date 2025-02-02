# Archive System

The archive system provides a way to store and query historical feed data, including submission details, approval status, and metadata. This is particularly useful for analytics and auditing purposes.

## Configuration

To enable archiving, add the archive configuration to your `curate.config.json`:

```json
{
  "plugins": {
    "supabase-archive": {
      "type": "archive",
      "url": "file:./backend/src/external/supabase-archive"
    }
  },
  "archive": {
    "plugin": "supabase-archive",
    "config": {
      "url": "YOUR_SUPABASE_URL",
      "serviceKey": "YOUR_SUPABASE_SERVICE_KEY"
    }
  }
}
```

## Setting Up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)

2. Get your project URL and service key from the project settings

3. Execute the following SQL in your Supabase SQL editor to set up the required functions and policies:

```sql
-- Create feed archives table and functions
[COPY CONTENTS OF feed-archives.sql HERE]
```

## Data Structure

Each archived feed item contains:

- `id`: Unique identifier
- `feed_id`: Associated feed identifier
- `submitted_by`: Original submitter
- `submitted_at`: Submission timestamp
- `status`: Current status
- `approved_by`: Approver (if applicable)
- `approved_at`: Approval timestamp (if applicable)
- `content`: Original content (JSON)
- `metadata`: Additional metadata (JSON)
- `created_at`: Record creation timestamp
- `updated_at`: Last update timestamp

## Querying Archive Data

The archive system provides several ways to query historical data:

```typescript
// Get items by submitter
const items = await archiveService.getFeedItemsBySubmitter("user123");

// Get items by status
const pendingItems = await archiveService.getFeedItemsByStatus("pending");

// Get items by approver
const approvedItems = await archiveService.getFeedItemsByApprover("admin123");

// Get overall statistics
const stats = await archiveService.getFeedStats();
```

## Security

The Supabase implementation includes Row Level Security (RLS) policies that:

- Restrict read access to authenticated users
- Restrict write access to authenticated users
- Enable updates only for authenticated users

Make sure to keep your service key secure and never expose it in client-side code.
