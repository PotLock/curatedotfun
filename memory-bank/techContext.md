# Technical Context

## Technology Stack

### Backend
- **Runtime**: Bun
- **Framework**: Elysia.js
- **Language**: TypeScript
- **Database**: File-based (with DB service abstraction)

### Frontend
- **Framework**: React
- **Build Tool**: RSBuild
- **Styling**: Tailwind CSS

### External Services
- **Twitter API**: Content source and moderation
- **Telegram API**: Content distribution
- **Notion API**: Content distribution

## Development Setup

### Core Dependencies
- Bun (JavaScript runtime)
- TypeScript
- Elysia.js and plugins
- React and related libraries

### Environment Configuration
- NODE_ENV
- PORT
- TWITTER_USERNAME
- TWITTER_PASSWORD
- TWITTER_EMAIL
- TWITTER_2FA_SECRET
- TELEGRAM_BOT_TOKEN
- FRONTEND_DIST_PATH

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
- Supabase: Data storage

### Transformer Plugins
- GPT Transform: AI-powered content transformation
- Simple Transform: Basic content formatting

### Source Plugins
- Twitter: Tweet monitoring and interaction
- Telegram: Message monitoring
- LinkedIn: Post monitoring (planned)

### Plugin Development
- Standardized plugin interfaces
- Mock system for testing
- Development toolkit
- Hot-reload support
- Custom endpoint capabilities

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
- Helmet middleware for HTTP security headers
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

### Monitoring
- Health check endpoint
- Service initialization status
- Graceful shutdown handling
- Error logging and recovery

## Development Practices

### Code Organization
- Service-based architecture
- Plugin-based extensibility
- TypeScript for type safety
- Modular component design

### Testing
- Unit tests for services
- Mock implementations for external services
- Test configuration files
- Integration test support
