# Clean Architecture Patterns

## Brief overview
This set of guidelines establishes a standardized approach for creating new projects following clean architecture principles with TypeScript. It focuses on maintainable, testable, and modular code organization with clear separation of concerns.

## Architecture layers
- Organize code into distinct layers: Core, Data Access, Service, and Presentation
- Maintain unidirectional dependencies flowing from outer layers (Presentation) to inner layers (Core)
- Use dependency injection to manage dependencies between layers
- Ensure each layer has a clear, single responsibility

## Type system
- Generate application types from database schema using tools like drizzle-zod
- Maintain a single source of truth for types in a centralized location
- Use Zod schemas for both validation and type generation
- Ensure consistent type usage across all application layers

## Repository pattern
- Implement a base repository with common CRUD operations
- Create domain-specific repositories extending the base repository
- Use type-safe operations with generated types
- Implement consistent error handling and transaction support
- Keep database-specific logic isolated in repositories

## Service layer
- Use constructor injection for service dependencies
- Implement service interfaces for better testability
- Keep business logic encapsulated within services
- Standardize error handling across services
- Ensure proper separation of concerns

## Dependency injection
- Use constructor injection as the primary DI pattern
- Implement a lightweight DI container for dependency resolution
- Register services and repositories with the container
- Resolve dependencies at application bootstrap

## Route organization
- Create modular route files for each resource
- Implement request validation using Zod schemas
- Standardize response formatting
- Set up centralized error handling middleware
- Keep route handlers focused on request/response handling

## Error handling
- Define custom error classes for different error types
- Implement a centralized error handler middleware
- Use consistent error structure with code, message, and context
- Implement detailed error logging with appropriate context
- Use error recovery strategies where appropriate

## Testing strategy
- Write unit tests for individual components with mocked dependencies
- Create integration tests for repository-database interactions
- Implement component tests for critical business flows
- Add E2E tests for API endpoints
- Use mock implementations for external dependencies

## File structure
- Use kebab-case for file names (e.g., `base.repository.ts`)
- Use PascalCase for classes and interfaces
- Use camelCase for functions and variables
- Organize files by feature and layer
- Group related files in dedicated directories

## Naming conventions
- Classes: PascalCase (e.g., `UserService`)
- Interfaces/Types: PascalCase, prefixed with I for interfaces when appropriate (e.g., `IUserService`, `UserData`)
- Functions/Methods: camelCase (e.g., `getUserById`)
- Variables: camelCase (e.g., `userData`)
- Constants: UPPER_SNAKE_CASE (e.g., `MAX_RETRY_COUNT`)
- Files: kebab-case.ts (e.g., `user.service.ts`)
- Folders: kebab-case (e.g., `user-management/`)

## Project structure
```
src/
├── core/                           # Core application components
│   ├── types.ts                    # Generated and core application types
│   ├── errors.ts                   # Custom error classes
│   ├── container.ts                # Dependency injection container
│   └── middleware/                 # Core middleware
│       ├── error-handler.ts        # Centralized error handler
│       └── validation.middleware.ts # Request validation middleware
├── services/                       # Business logic services
│   ├── user/
│   │   └── user.service.ts
│   ├── auth/
│   │   └── auth.service.ts
│   └── index.ts                    # Service exports
├── services/db/                    # Database services
│   ├── repositories/               # Repository pattern implementation
│   │   ├── base.repository.ts      # Base repository with common CRUD
│   │   ├── user.repository.ts
│   │   └── index.ts
│   ├── connection.ts               # Database connection management
│   ├── schema.ts                   # Schema definitions
│   └── transaction.ts              # Transaction utilities
├── routes/                         # API routes
│   ├── index.ts                    # Main router
│   ├── user.routes.ts
│   └── auth.routes.ts
├── utils/                          # Utility functions
│   ├── logger.ts
│   └── config.ts
├── app.ts                          # Application bootstrap
└── index.ts                        # Entry point
