---
sidebar_position: 5
---

# Deployment

This guide covers deploying the application to various environments.

## Deploying to Fly.io

The backend service can be deployed to Fly.io with SQLite support.

### Prerequisites

Install the Fly CLI:

```bash
# macOS
brew install flyctl

# Windows
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"

# Linux
curl -L https://fly.io/install.sh | sh
```

### Authentication

Sign up and authenticate with Fly.io:

```bash
fly auth signup
# or
fly auth login
```

### Deployment Steps

1. Initialize your Fly.io application:

```bash
bun run deploy:init
```

This will create the Fly App, the LiteFS volume (see [LiteFS Spreedrun](https://fly.io/docs/litefs/speedrun/) for more information), and attach Consul for LiteFS cluster management (this sets the FLY_CONSUL_URL secret for the app, which is required for LitefS leases)

2. The app will crash the first time, because your Fly App needs environment variables set (sorry, you have to do this manually):

```bash
fly secrets set TWITTER_USERNAME=your_twitter_username
fly secrets set TWITTER_PASSWORD=your_twitter_password
fly secrets set TWITTER_EMAIL=your_twitter_email
```

For distribution services, these will hydrate the curate.config.json:

```bash
# Telegram
fly secrets set TELEGRAM_BOT_TOKEN=your_bot_token
fly secrets set TELEGRAM_CHANNEL_ID=your_channel_id
```

2. Then redeploy the application. Use this command for any future deployments:

```bash
bun run deploy
```

### Configuration

The deployment includes:

- Distributed SQLite using LiteFS
- Automatic file replication across instances
- High availability with minimum 2 machines
- Primary/replica configuration using Consul
- HTTPS enabled by default

#### Architecture

- Primary instance (LAX region) handles write operations
- Replicas automatically sync data from primary
- Consul manages primary/replica coordination
- Automatic failover if primary becomes unavailable

#### Key Files

- `fly.toml`: Main Fly.io configuration
- `litefs.yml`: LiteFS configuration
- `Dockerfile`: Container and LiteFS setup

### Monitoring

Monitor your deployment:

```bash
# View deployment status
fly status

# View logs
fly logs

# Access the Fly.io dashboard
fly dashboard
```

### Troubleshooting

Common issues and solutions:

1. **Database Connection Issues**
   - Check LiteFS mount status: `fly ssh console -C "ls -la /litefs"`
   - Verify Consul connection: `fly consul status`
   - Check primary/replica status: `fly logs`

2. **File Replication Issues**
   - Verify LiteFS FUSE mount: `fly ssh console -C "mount | grep litefs"`
   - Check file permissions: `fly ssh console -C "ls -la /src"`
   - Monitor LiteFS logs: `fly logs --level debug`

3. **Memory/CPU Issues**
   - Monitor resource usage: `fly status`
   - Check machine distribution: `fly scale show`
   - Adjust VM configuration in fly.toml if needed

4. **Primary/Replica Issues**
   - Verify Consul health: `fly consul status`
   - Check region configuration: `fly regions list`
   - Monitor primary elections: `fly logs --level info`

For more help, consult the [Fly.io documentation](https://fly.io/docs/) or join their [community Discord](https://fly.io/discord).
