<!-- markdownlint-disable MD014 -->
<!-- markdownlint-disable MD033 -->
<!-- markdownlint-disable MD041 -->
<!-- markdownlint-disable MD029 -->

<div align="center">

<h1 style="font-size: 2.5rem; font-weight: bold;">curate.fun frontend</h1>

  <p>
    <strong>React-based frontend application for the curate.fun platform</strong>
  </p>

</div>

<details>
  <summary>Table of Contents</summary>

- [Architecture Overview](#architecture-overview)
  - [Tech Stack](#tech-stack)
  - [Application Structure](#application-structure)
- [Key Features](#key-features)
  - [Content Display](#content-display)
  - [User Settings](#user-settings)
  - [Responsive Design](#responsive-design)
- [Development](#development)
  - [Prerequisites](#prerequisites)
  - [Local Setup](#local-setup)
- [Backend Integration](#backend-integration)

</details>

## Architecture Overview

### Tech Stack

The frontend leverages modern web technologies for optimal performance and developer experience:

- **Framework**: [React](https://reactjs.org) + TypeScript
  - Component-based architecture
  - Strong type safety
  - Excellent ecosystem support

- **Build Tool**: [RSBuild](https://rsbuild.dev/)
  - High-performance build system
  - Optimized production builds
  - Modern development experience

- **Styling**: [Tailwind CSS](https://tailwindcss.com)
  - Utility-first CSS framework
  - Highly customizable
  - Zero runtime overhead

- **Routing**: [TanStack Router](https://tanstack.com/router)
  - Type-safe routing
  - Efficient navigation
  - Data-driven route handling

### Application Structure

```bash
src/
├── components/     # React components
│   ├── FeedItem.tsx
│   ├── FeedList.tsx
│   ├── Header.tsx
│   ├── HowItWorks.tsx
│   ├── Layout.tsx
│   ├── Modal.tsx
│   └── Settings.tsx
├── lib/           # Utility functions and API clients
│   ├── api.ts
│   ├── config.ts
│   └── twitter.ts
├── routes/        # Application routes
│   ├── __root.tsx
│   ├── feed.$feedId.tsx
│   ├── index.tsx
│   └── settings.tsx
├── types/         # TypeScript definitions
├── App.tsx        # Root component
└── index.tsx      # Application entry point
```

## Key Features

### Content Display

The frontend provides a rich content viewing experience:

- Feed-based content organization
- Customizable content views
- Content filtering and sorting
- Responsive content cards

### User Settings

- Customizable feed preferences
- Theme selection
- Notification settings
- Distribution channel configuration

### Responsive Design

- Mobile-first approach
- Adaptive layouts
- Cross-browser compatibility
- Accessible UI components

## Development

### Prerequisites

- Node.js 18+
- Bun (recommended) or npm
- Backend service running locally (for full functionality)

### Local Setup

1. Install dependencies:

```bash
bun install
```

2. Start development server:

```bash
bun run dev
```

The app will be available at `http://localhost:5173`

## Backend Integration

The frontend communicates with the [backend service](../backend/README.md) through a RESTful API:

- Content retrieval via `/api/feeds` endpoints
- Settings management through `/api/settings`
- Plugin configuration via `/api/plugins`
- Content submission through Twitter integration

See the [Backend README](../backend/README.md) for detailed API documentation and service architecture.

<div align="right">
<a href="https://nearbuilders.org" target="_blank">
<img
  src="https://builders.mypinata.cloud/ipfs/QmWt1Nm47rypXFEamgeuadkvZendaUvAkcgJ3vtYf1rBFj"
  alt="Near Builders"
  height="40"
/>
</a>
</div>
