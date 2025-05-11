# Technical Context

## Technology Stack

### Backend
- **Node.js**: Runtime environment
- **TypeScript**: Programming language with static typing
- **Hono**: High-performance web framework
- **PostgreSQL**: Primary database
- **Drizzle ORM**: Type-safe database toolkit
- **Module Federation**: Plugin system architecture
- **Zod**: Schema validation and type generation
- **Bun**: Fast JavaScript runtime for scripts and tests
- **Docker**: Containerization for deployment and development
- **Railway**: Deployment platform

### Frontend
- **React**: UI library
- **TypeScript**: Programming language with static typing
- **TanStack Router**: Type-safe routing
- **TailwindCSS**: Utility-first CSS framework
- **RSBuild**: Build system optimized for React

### Development Tools
- **pnpm**: Package manager
- **Corepack**: Package manager version consistency
- **Turborepo**: Monorepo build system
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **RSPack**: Build system for backend

## Core Libraries

### Database
- **Drizzle ORM**: Type-safe database toolkit
  - Schema definition
  - Query building
  - Migration management
  - Type generation
- **pg**: PostgreSQL client
- **drizzle-zod**: Zod schema generation from Drizzle schema

### API Framework
- **Hono**: High-performance web framework
  - Middleware support
  - Type-safe routing
  - Request validation
  - Error handling
  - Static file serving
- **@hono/node-server**: Node.js adapter for Hono
- **@hono/zod-validator**: Zod integration for request validation

### Plugin System
- **Module Federation**: Dynamic code loading
  - Runtime plugin loading
  - Type-safe plugin interfaces
  - Hot-reloading support
  - Plugin caching and invalidation
- **@module-federation/node**: Node.js support for Module Federation
- **@module-federation/runtime**: Runtime support for Module Federation

### Utilities
- **async-retry**: Retry logic for transient errors
- **zod**: Schema validation and type generation
- **pino**: Logging library
- **dotenv**: Environment variable loading

## Development Environment

### Local Development
- **Docker Compose**: Local development environment
  - PostgreSQL container
  - Volume mounting for persistence
  - Environment variable configuration
- **Bun**: Fast JavaScript runtime for scripts and tests
- **pnpm**: Package manager with workspaces support
- **Turborepo**: Build orchestration and caching

### Testing
- **Bun Test**: Testing framework
- **Docker Compose**: Test environment setup
  - Isolated test database
  - Service dependencies
- **Mock implementations**: For external services
- **Component tests**: For critical flows
- **Integration tests**: For database operations
- **Unit tests**: For utility functions

### CI/CD
- **GitHub Actions**: CI/CD pipeline
  - Automated testing
  - Build verification
  - Deployment to Railway
- **Railway**: Deployment platform
  - Container-based deployment
  - Environment variable management
  - Database provisioning

## Database Schema

The database schema is defined using Drizzle ORM and includes the following tables:

- **feeds**: Stores feed configurations
- **submissions**: Stores tweet submissions
- **submission_feeds**: Links submissions to feeds with status
- **moderation_history**: Tracks moderation actions
- **submission_counts**: Tracks daily submission counts
- **feed_plugins**: Stores plugin configurations per feed
- **feed_recaps_state**: Tracks the state of recap jobs
- **twitter_cookies**: Stores Twitter authentication cookies
- **twitter_cache**: Caches Twitter-related data

## API Endpoints

The API is organized into the following routes:

- **/api/submissions**: Submission management
- **/api/feeds**: Feed management
- **/api/config**: Configuration management
- **/api/leaderboard**: Leaderboard data
- **/api/stats**: System statistics
- **/api/plugin**: Plugin management
- **/api/recap**: Recap management
- **/api/trigger**: Manual triggers for actions
- **/api/test**: Testing endpoints (non-production)

## Refactoring Technologies

### Type Generation
- **drizzle-zod**: Generate Zod schemas from Drizzle tables
- **zod**: Schema validation and type inference

### Dependency Injection
- Custom lightweight DI container
- Constructor injection pattern
- Service factory pattern

### Repository Pattern
- Base repository with common CRUD operations
- Type-safe database operations
- Transaction support with retry logic

### Error Handling
- Custom error classes
- Centralized error handler middleware
- Detailed error logging with context

### Route Organization
- Modular route definitions
- Request validation with Zod
- Response formatting
- Error handling middleware

## Deployment Architecture

### Container-based Deployment
- Docker containers
- Railway platform
- Environment-specific configurations

### Database
- PostgreSQL on Railway
- Connection pooling
- Read/write separation capability

### Scaling
- Horizontal scaling with multiple instances
- Database connection pooling
- Efficient resource usage

## Security Considerations

- **CORS**: Configured for allowed origins
- **Secure Headers**: HTTP security headers
- **Input Validation**: Zod schema validation
- **Database Security**: Parameterized queries via Drizzle
- **Error Handling**: Safe error responses
- **Authentication**: Planned Web3Auth integration

## Performance Considerations

- **Connection Pooling**: Efficient database connections
- **Read/Write Separation**: Optimized database access
- **Caching**: Strategic caching of expensive operations
- **Efficient Queries**: Optimized database queries
- **Resource Management**: Proper cleanup of resources
