# Technical Context

## Technology Stack

### Backend
- **Runtime**: Node.js (production), Bun (development)
- **Framework**: Hono
- **Language**: TypeScript
- **Database**: SQLite with better-sqlite3 (with DB service abstraction)
- **Build Tool**: RSPack

### Frontend
- **Framework**: React 18
- **Router**: TanStack Router
- **State Management**: TanStack Query
- **Build Tool**: RSBuild
- **Styling**: Tailwind CSS

### External Services
- **Twitter API**: Content source and moderation
- **Telegram API**: Content distribution
- **Notion API**: Content distribution
- **NEAR Social**: Content distribution
- **OpenRouter API**: AI transformations

## Development Setup

### Core Dependencies
- Node.js (runtime in production)
- Bun (package manager and development runtime)
- TypeScript (5.x+)
- Hono (latest)
- React (18.x)
- TanStack Router & Query
- RSBuild & RSPack
- Tailwind CSS
- Testing Libraries
  * Jest
  * Testing Library
  * Playwright

### Environment Configuration
- Core Settings
  * NODE_ENV
  * PORT
  * LOG_LEVEL
- Twitter Auth
  * TWITTER_USERNAME
  * TWITTER_PASSWORD
  * TWITTER_EMAIL
  * TWITTER_2FA_SECRET
- Distribution Settings
  * TELEGRAM_BOT_TOKEN
  * NOTION_API_KEY
  * OPENROUTER_API_KEY
  * SHIPPOST_NEAR_SOCIAL_KEY
- Plugin Settings
  * PLUGIN_CACHE_TTL
  * MAX_PLUGIN_MEMORY

## Plugin System

### Core Plugin Features
- Runtime module federation loading
- Hot-reloading support
- Custom endpoint registration
- Scheduled task integration
- Type-safe configuration

### Distributor Plugins
- Telegram: Real-time message distribution
- RSS: Feed generation
- Notion: Database integration
- NEAR Social: Content posting

### Transformer Plugins
- AI Transform: AI-powered content transformation
- Simple Transform: Basic content formatting
- Object Transform: Data mapping and transformation

### Source Plugins
- Twitter: Tweet monitoring and interaction
- Telegram: Message monitoring (planned)
- LinkedIn: Post monitoring (planned)

### Plugin Development
- Development Tools
  * Plugin development kit
  * Type generation utilities
  * Testing helpers
  * Documentation generators
- Testing Infrastructure
  * Mock system
  * Test runners
  * Fixture generators
  * Performance testing tools
- Development Features
  * Hot-reload support
  * Debug logging
  * State inspection
  * Performance profiling

## Task Scheduling

### Cron Jobs
- Configuration-driven scheduling
- Recap generation tasks
- Plugin-specific scheduled tasks
- Execution monitoring
- Error handling and retries

### Recap System
- Scheduled content aggregation
- Customizable transformation
- Multi-channel distribution
- Configurable schedules (cron syntax)

## Security Considerations

### API Security
- CORS with allowed origins configuration
- Secure headers middleware
- Cross-Origin policies
- Content Security Policy

### Authentication & Authorization
- Twitter-based curator authentication
- Environment-based service authentication
- API endpoint access control

## Deployment

### Requirements
- Node.js environment
- Environment variables configuration
- Plugin dependencies
- Frontend build artifacts

### Infrastructure
- Fly.io deployment
- LiteFS for SQLite replication
- Health check endpoint
- Graceful shutdown handling

### Monitoring
- Health check endpoint
- Service initialization status
- Graceful shutdown handling
- Error logging and recovery

## Development Practices

### Code Organization
- Architecture
  * Service-based design
  * Plugin system
  * Event-driven patterns
  * Clean architecture principles
- Standards
  * TypeScript strict mode
  * ESLint configuration
  * Prettier formatting
  * Import organization
- Component Design
  * Atomic design principles
  * Reusable patterns
  * Performance optimization
  * Error boundaries

### Testing Strategy
- Unit Testing
  * Service tests
  * Component tests
  * Plugin tests
  * Utility tests
- Integration Testing
  * API endpoints
  * Plugin interactions
  * Service integration
  * Event handling
- E2E Testing
  * User flows
  * Plugin workflows
  * Distribution paths
  * Error scenarios
- Performance Testing
  * Load testing
  * Stress testing
  * Memory profiling
  * Bottleneck identification

### Project Structure
- Monorepo with Turborepo
- Backend and Frontend
- Shared types and utilities
- Documentation as a separate package
