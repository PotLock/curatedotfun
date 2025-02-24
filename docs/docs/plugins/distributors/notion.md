---
sidebar_position: 2
---

# 📝 Notion Plugin

The Notion plugin enables distribution of curated content to a Notion database, automatically creating database rows with your curated content and metadata.

## 🔧 Setup Guide

1. Create a Notion integration:
   - Go to [Notion Integrations](https://www.notion.so/my-integrations)
   - Click "New integration"
   - Name your integration (e.g., "Curate.fun Integration")
   - Select the workspace where you'll use the integration
   - Click "Submit" to create the integration
   - Copy the "Internal Integration Token" - this will be your `token` in the configuration

2. Create a database in Notion:
   - Create a new page in Notion
   - Type `/database` and select "Table - Full page"
   - Add the following properties to your database (matching TwitterSubmission type):
     - tweetId (Title)
     - userId (Text)
     - username (Text)
     - curatorId (Text)
     - curatorUsername (Text)
     - content (Text)
     - curatorNotes (Text)
     - curatorTweetId (Text)
     - createdAt (Date)
     - submittedAt (Date)
     - status (Select with options: pending, approved, rejected)

   :::important
   Make sure to set up the properties with the exact types specified:
   - tweetId must be a Title property (not Text)
   - createdAt and submittedAt must be Date properties
   - status must be a Select property with the options: pending, approved, rejected
   - All other fields should be Text properties
   :::

3. Share the database with your integration:
   - Open your database as a full page
   - Click the "..." menu in the top right
   - Click "Add connections"
   - Find and select your integration

4. Get your database ID:
   - Open your database as a full page in your browser
   - Copy the URL, which will look like:

     ```bash
     https://www.notion.so/<long_hash_1>?v=<long_hash_2>
     ```

   - The `<long_hash_1>` portion is your database ID

5. Modify your `curate.config.json` to include the Notion configuration:

   ```json
   {
     "outputs": {
       "stream": {
         "enabled": true,
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
     }
   }
   ```

   You need to specify:
   - `token`: Notion Internal Integration Token
   - `databaseId`: Your database ID extracted from the URL

   :::caution
   Keep your integration token secure and never commit it to version control. Consider using environment variables for sensitive values.
   :::

6. Enable the stream by setting `"enabled": true` if not already enabled.

   Once configured, your approved submissions will start flowing to the configured Notion database as new rows.

   :::tip
   If your stream had been disabled and you have existing, approved submissions, call `/api/feeds/:feedId/process` to process them.
   :::

## 📝 Configuration Reference

Full configuration options for the Notion plugin:

```json
{
  "plugin": "@curatedotfun/notion",
  "config": {
    "token": "secret_...", // Your Notion integration token
    "databaseId": "..." // Your Notion database ID
  }
}
```
