# Project Rules and Patterns

## Development Patterns

### Package Management
- Use pnpm for package management (pnpm@10.6.4)
- Use Corepack for package manager version consistency
- Bun is used for running scripts and tests only
- Save type errors and dependency installations until ready to address them

### Database
- PostgreSQL with Drizzle ORM is the primary database
- Use Docker-based development environment for PostgreSQL
- Implement read/write separation for scalability
- Use transaction support with retry logic

### Testing
- Focus on component tests as primary testing strategy
- Use Docker-Compose for real database and infrastructure testing
- Implement a fake MQ for message queue testing
- Follow the testing plan outlined in memory-bank/testingPlan.md

### Code Organization
- Use service-based architecture
- Implement plugin system with module federation for extensibility
- Follow clean architecture principles
- Use TypeScript strict mode

### Monorepo Structure
- Use Turborepo for build orchestration and caching
- pnpm workspaces for dependency management
- Separate backend and frontend as distinct workspaces

### Build System
- Use RSPack for backend building
- Use RSBuild for frontend building
- Support for module federation
- Optimized for TypeScript

## Project Preferences

### Code Style
- Use ESLint and Prettier for code formatting
- Follow TypeScript strict mode guidelines
- Organize imports consistently
- Use consistent naming conventions

### Error Handling
- Implement granular error types
- Use graceful degradation strategies
- Implement comprehensive error logging
- Use error recovery mechanisms

### JSON Sanitization
- Sanitize JSON throughout the transformation pipeline
- Handle BOM characters properly
- Handle nested stringified JSON
- Implement proper error handling for malformed JSON

### Deployment
- Deploy to Railway using Docker containers
- Use Kubernetes for orchestration
- Implement CI/CD with GitHub Actions
- Use environment-specific configurations

### Security
- Implement proper database security measures
- Plan for Web3Auth integration in frontend
- Use secure headers and CORS policies
- Implement audit logging for sensitive operations

## Critical Implementation Paths

### Content Flow
1. Twitter submission → SubmissionService
2. Moderation via Twitter → Status update
3. ProcessorService → Global transforms
4. DistributionService → Distributor-specific transforms
5. Distribution to configured channels

### Recap Flow
1. Scheduler service creates jobs based on feed configuration
2. External scheduler triggers recap job via HTTP endpoint
3. Recap job fetches approved submissions since last run
4. ProcessorService applies batch transformations
5. Distribution to configured channels
6. Update last successful completion timestamp

### Plugin System
1. PluginService loads plugins at runtime via module federation
2. Plugins register with appropriate service
3. Services use plugins based on configuration
4. Error handling and recovery for plugin failures

### Database Operations
1. Connection pooling with read/write separation
2. Transaction support with retry logic
3. Error handling and connection management
4. Type-safe queries with Drizzle ORM
5. Repository pattern for domain-specific operations
6. State tracking for external scheduled jobs

## Current Focus Areas

### Backend Refactoring
- Implementing a comprehensive refactoring of the backend architecture
- Deriving application types from database schema for consistency
- Standardizing service initialization and dependency injection
- Implementing a more modular route structure
- Centralizing error handling
- Fully adopting the repository pattern
- Improving code organization and reducing redundancy
- Enhancing testability through clear separation of concerns
- Making the plugin system more modular and reusable

### Refactoring Patterns
- Always derive types from `core/types.ts`
- Repositories must extend `BaseRepository`
- Services must use constructor injection for dependencies, resolved via the DI container
- API routes should be defined in dedicated `*.routes.ts` files and use `zod-validator`
- Throw custom errors from `core/errors.ts` in services and repositories
- Business logic resides in services, data access in repositories, request/response handling in routes

### Naming Conventions
- Files: `kebab-case.ts` (e.g., `submission.service.ts`, `base.repository.ts`)
- Classes: `PascalCase` (e.g., `SubmissionService`, `BaseRepository`)
- Interfaces/Types: `PascalCase` (e.g., `Submission`, `NewFeed`)
- Functions/Methods: `camelCase` (e.g., `getSubmissionById`, `createApp`)
- Variables/Constants: `camelCase` for local variables, `UPPER_SNAKE_CASE` for true constants
- Folders: `kebab-case` for directories containing multiple related files

### File Structure
- Core types and utilities in `backend/src/core/`
- Services in `backend/src/services/`
- Repositories in `backend/src/services/db/repositories/`
- Routes in `backend/src/routes/`
- Utilities in `backend/src/utils/`
- Application bootstrap in `backend/src/app.ts`
- Entry point in `backend/src/index.ts`
