<!-- markdownlint-disable MD014 -->
<!-- markdownlint-disable MD033 -->
<!-- markdownlint-disable MD041 -->
<!-- markdownlint-disable MD029 -->

<div align="center">

<img src="landing-page/public/meta.png" alt="curate.fun banner" width="100%" />

<h1 style="font-size: 2.5rem; font-weight: bold;">curate.fun</h1>

  <p>
    <strong>curate news on socials & build community-owned autonomous brands</strong>
  </p>

  <p>
    <a href="https://docs.curate.fun" target="_blank"><strong>📚 Documentation</strong></a> •
    <a href="https://github.com/potlock/curatedotfun" target="_blank"><strong>💻 GitHub</strong></a> •
    <a href="https://x.com/curatedotfun" target="_blank"><strong>🐦 Twitter</strong></a> •
    <a href="https://t.me/+UM70lvMnofk3YTVh" target="_blank"><strong>💬 Telegram</strong></a>
  </p>

</div>

<details>
  <summary>Table of Contents</summary>

- [Getting Started](#getting-started)
  - [For Curators](#for-curators)
  - [For Developers](#for-developers)
- [System Architecture](#system-architecture)
  - [Content Flow Architecture](#content-flow-architecture)
  - [Key Components](#key-components)
  - [Monorepo Overview](#monorepo-overview)
- [Development](#development)
  - [Installing dependencies](#installing-dependencies)
  - [Running the app](#running-the-app)
  - [Building for production](#building-for-production)
  - [Deploying](#deploying)
  - [Running tests](#running-tests)
- [Configuration & Usage](#configuration--usage)
- [Contributing](#contributing)

</details>

## Getting Started

Choose your path to get started with curate.fun ⚡

### For Curators

If you want to submit and curate content:

1. 🎯 Head to the [User Guide](https://docs.curate.fun/docs/user-guides/curation)
2. 🔗 Learn how to submit content and moderate feeds
3. 🌟 Apply to become a curator for specific feeds

### For Developers

If you want to build and customize feeds:

1. 📖 Start with the [Configuration Guide](https://docs.curate.fun/docs/developers/configuration)
2. 🚀 Learn about [Deployment](https://docs.curate.fun/docs/developers/deployment)
3. 🔌 Explore [Plugin Development](https://docs.curate.fun/docs/developers/plugins)

## System Architecture

### Content Flow Architecture

```mermaid
graph TD
    %% Content Sources
    subgraph Sources["Content Sources"]
        Twitter["Twitter Source Plugin"]
        Telegram["Telegram Source Plugin"]
        LinkedIn["LinkedIn Source Plugin (Planned)"]
        style Twitter color:black
        style Telegram color:black
        style LinkedIn color:black
    end
    
    %% Submission Processing
    subgraph Submission["Submission Processing"]
        SubmissionService["Submission Service"]
        Moderation["Curator Moderation"]
        style SubmissionService color:black
        style Moderation color:black
    end
    
    %% Content Processing
    subgraph Processing["Content Processing"]
        ProcessorService["Processor Service"]
        GlobalTransform["Global Transformations"]
        style ProcessorService color:black
        style GlobalTransform color:black
    end
    
    %% Distribution
    subgraph Distribution["Distribution"]
        DistributionService["Distribution Service"]
        DistTransform["Distributor-specific Transforms"]
        style DistributionService color:black
        style DistTransform color:black
    end
    
    %% Distributor Plugins
    subgraph Distributors["Distributor Plugins"]
        TelegramDist["Telegram"]
        RSS["RSS"]
        Notion["Notion"]
        Supabase["Supabase"]
        style TelegramDist color:black
        style RSS color:black
        style Notion color:black
        style Supabase color:black
    end
    
    %% Flow connections
    Sources --> SubmissionService
    SubmissionService --> Moderation
    Moderation --> ProcessorService
    ProcessorService --> GlobalTransform
    GlobalTransform --> DistributionService
    DistributionService --> DistTransform
    DistTransform --> Distributors
    
    %% Styling
    classDef service fill:#f9f,stroke:#333,stroke-width:2px
    classDef plugin fill:#bbf,stroke:#333,stroke-width:1px
    classDef process fill:#bfb,stroke:#333,stroke-width:1px
    
    class SubmissionService,ProcessorService,DistributionService service
    class Twitter,Telegram,LinkedIn,TelegramDist,RSS,Notion,Supabase plugin
    class Moderation,GlobalTransform,DistTransform process
```

### Key Components

- **Frontend**
  - React-based web interface
  - Built with RSBuild and Tailwind CSS
  - Handles user interactions and submissions

- **Backend**
  - Node.js runtime with Hono.js framework
  - Plugin-based architecture with module federation
  - Service-oriented design with clear boundaries
  - Twitter bot functionality
  - API endpoints for frontend

### Monorepo Overview

This project uses a monorepo structure managed with [Turborepo](https://turbo.build/repo) for efficient build orchestration:

```bash
curatedotfun/
├── frontend/          # React frontend application (app.curate.fun)
├── backend/           # Node.js backend service (app.curate.fun)
├── docs/              # Documentation website (docs.curate.fun)
├── landing/           # Landing page website (curate.fun)
├── package.json       # Root package.json for shared dependencies
└── turbo.json         # Turborepo configuration
```

## Development

### Installing dependencies

The monorepo uses npm for package management. Install all dependencies with:

```bash
npm install
```

This will install dependencies for all packages in the monorepo.

### Running the app

Start both frontend and backend development servers:

```bash
npm run dev
```

This will launch:

- Frontend at <http://localhost:5173>
- Backend at <http://localhost:3000>

### Building for production

Build all packages:

```bash
npm run build
```

### Deploying

For deployment instructions, see our [Deployment Guide](./docs/docs/developers/deployment.md).

### Running tests

```bash
npm run test
```

Tests are located in the backend's `src/__tests__` directory. Run them using `npm run test`.

## Configuration & Usage

For detailed information about configuration, submission process, and usage, please refer to our documentation:

- [📚 Documentation Website](https://docs.curate.fun): Complete documentation
- [📖 Configuration Guide](https://docs.curate.fun/docs/developers/configuration): Feed setup, plugins, and system configuration
- [👥 User Guide](https://docs.curate.fun/docs/user-guides/curation): How to submit and moderate content
- [🛠️ Developer Guide](https://docs.curate.fun/docs/developers): Technical documentation for developers

## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you're interested in contributing to this project, please read the [contribution guide](./CONTRIBUTING.md).

<div align="right">
<a href="https://nearbuilders.org" target="_blank">
<img
  src="https://builders.mypinata.cloud/ipfs/QmWt1Nm47rypXFEamgeuadkvZendaUvAkcgJ3vtYf1rBFj"
  alt="Near Builders"
  height="40"
/>
</a>
</div>
