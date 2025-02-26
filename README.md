<!-- markdownlint-disable MD014 -->
<!-- markdownlint-disable MD033 -->
<!-- markdownlint-disable MD041 -->
<!-- markdownlint-disable MD029 -->

<div align="center">

<h1 style="font-size: 2.5rem; font-weight: bold;">curate.fun</h1>

  <p>
    <strong>Bot to curate and to streamline to different news feeds</strong>
  </p>

</div>

<details>
  <summary>Table of Contents</summary>

- [Project Structure](#project-structure)
  - [Monorepo Overview](#monorepo-overview)
  - [Key Components](#key-components)
- [Getting Started](#getting-started)
  - [Installing dependencies](#installing-dependencies)
  - [Environment Setup](#environment-setup)
  - [Running the app](#running-the-app)
  - [Building for production](#building-for-production)
  - [Deploying](#deploying)
  - [Running tests](#running-tests)
- [Configuration & Usage](#configuration--usage)
- [Contributing](#contributing)

</details>

## Project Structure

### Monorepo Overview

This project uses a monorepo structure managed with [Turborepo](https://turbo.build/repo) for efficient build orchestration:

```bash
curation-bot/
├── frontend/          # React frontend application
├── backend/           # Bun-powered backend service
├── package.json       # Root package.json for shared dependencies
└── turbo.json         # Turborepo configuration
```

### Key Components

- **Frontend** ([Documentation](./frontend/README.md))
  - React-based web interface
  - Built with Vite and Tailwind CSS
  - Handles user interactions and submissions

- **Backend** ([Documentation](./backend/README.md))
  - Bun runtime for high performance
  - Twitter bot functionality
  - API endpoints for frontend
  - Distribution services for RSS and Telegram

### Available Feeds

The platform currently supports several curated feeds:

- **Crypto Grant Wire**: Blockchain grant updates
- **This Week in Ethereum**: Ethereum ecosystem updates
- **NEARWEEK**: NEAR Protocol updates
- **AI x Crypto News**: AI and blockchain intersection
- **AI News**: AI updates
- **Crypto News**: General crypto updates
- **Public Goods FM**: Public goods focus
- **REFI DAO**: Regenerative Finance updates
- **DeSci World**: Decentralized Science updates
- **Network State News**: Network states & intentional communities
- **SOL-WEEK**: Solana ecosystem updates
- **Web3 Fundraising**: Fundraising announcements

## Getting Started

### Installing dependencies

The monorepo uses Bun for package management. Install all dependencies with:

```bash
bun install
```

This will install dependencies for both frontend and backend packages.

### Environment Setup

Copy the environment template and configure your credentials:

```bash
cp .env.example .env
```

Required environment variables:

```env
# Twitter API Credentials
TWITTER_USERNAME=your_twitter_username
TWITTER_PASSWORD=your_twitter_password
TWITTER_EMAIL=your_twitter_email

# Distribution Services Configuration

# Telegram (Optional)
TELEGRAM_BOT_TOKEN=          # Your Telegram bot token
TELEGRAM_CHANNEL_ID=         # Target channel ID for posts
```

### Running the app

Start both frontend and backend development servers:

```bash
bun run dev
```

This will launch:

- Frontend at <http://localhost:5173>
- Backend at <http://localhost:3000>

### Building for production

Build all packages:

```bash
bun run build
```

### Deploying

For deployment instructions, see our [Deployment Guide](./docs/docs/developers/deployment.md).

### Running tests

```bash
bun run test
```

Tests are located in the backend's `src/__tests__` directory. Run them using `bun run test`.

## Configuration & Usage

For detailed information about configuration, submission process, and usage, please refer to our documentation:

- [Configuration Guide](./docs/docs/developers/configuration): Feed setup, plugins, and system configuration
- [User Guide](./docs/docs/user-guides/curation): How to submit and moderate content
- [Developer Guide](./docs/docs/developers/): Technical documentation for developers

## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you're interested in contributing to this project, please read the [contribution guide](./CONTRIBUTING).

<div align="right">
<a href="https://nearbuilders.org" target="_blank">
<img
  src="https://builders.mypinata.cloud/ipfs/QmWt1Nm47rypXFEamgeuadkvZendaUvAkcgJ3vtYf1rBFj"
  alt="Near Builders"
  height="40"
/>
</a>
</div>
