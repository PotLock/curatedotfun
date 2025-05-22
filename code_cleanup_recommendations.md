# Code Consolidation, Cleanup, and Standardization Recommendations

This document provides recommendations for general code improvements, focusing on consistency, dependency management, and clarity within the `curatedotfun` backend.

## 1. ServiceProvider and Dependency Injection (DI) - COMPLETED

**Status: COMPLETED**

**Summary of Changes Made:**
*   `ConfigService` and `PluginService` were refactored to remove their singleton patterns. They are now instantiated directly by `ServiceProvider`.
*   `ServiceProvider`'s constructor and initialization were updated to accept `AppConfig` and manage the lifecycle of `ConfigService` and `PluginService`.
*   Database connection management was centralized. `ServiceProvider` and other services now use the `db` instance exported from `backend/src/services/db/index.ts`, and the old `DatabaseConnection` wrapper was removed from the DI flow.
*   Services like `UserService`, `SubmissionService`, and the newly created `FeedService` now receive all their dependencies (repositories, other services, `db`, `logger`, `appConfig`) via constructor injection managed by `ServiceProvider`.
*   `FeedService` (`backend/src/services/feed.service.ts`) was created to encapsulate business logic for feed operations.
*   `SubmissionService` (`backend/src/services/submission.service.ts`) was augmented with methods for reading submission data.
*   Route handlers in `backend/src/routes/api/feeds.ts` and `backend/src/routes/api/submission.ts` were refactored to use these services, obtaining them from `ServiceProvider` via the Hono context (`c.get('sp')`), instead of directly accessing repositories.
*   The Hono context environment type (`Env` in `backend/src/types/app.ts`) was updated to include the `ServiceProvider` instance (`sp`).
*   `backend/src/app.ts` was updated to initialize `ServiceProvider` early with `appConfig` and set the `sp` instance on the Hono context.
*   `backend/src/index.ts` was updated to reflect changes in database connection management for graceful shutdown.

**Original Recommendation Details (for historical reference):**

*   **Issue**: While `ServiceProvider` exists, its usage and the way dependencies (especially repositories) are provided to services are inconsistent. Some services get repositories injected, while others might be expected to import them or the `ServiceProvider` itself has discrepancies (e.g., `SubmissionService` constructor). Some route handlers also import repositories directly.
*   **Recommendation**:
    1.  **Standardize DI through `ServiceProvider`**:
        *   Ensure `ServiceProvider` is the single source for obtaining service instances.
        *   All services should receive their dependencies (other services, repositories, config values) via constructor injection, configured within the `ServiceProvider`'s constructor.
        *   **Example (`ServiceProvider` modification for `SubmissionService`):**
            ```typescript
            // backend/src/utils/service-provider.ts
            // ...
            const feedRepository = new FeedRepository(db); 
            const submissionRepository = new SubmissionRepository(db);
            // ...
            const submissionService = new SubmissionService(
              submissionRepository, // Inject
              feedRepository,     // Inject
              processorService,
              db, // Pass the DB instance if needed for transactions directly in service
              appConfig,
              logger // Inject logger
            );
            this.services.set("submissionService", submissionService);
            // ...
            ```
    2.  **Route Handlers Use Services**: Route handlers should primarily interact with services, not repositories directly. Services encapsulate business logic and data access rules.
        *   **Refactor `backend/src/routes/api/feeds.ts` and `backend/src/routes/api/submission.ts`**:
            *   Instead of `import { feedRepository } from "../../services/db/repositories";`, these files should get the `FeedService` (or `SubmissionService`) from `ServiceProvider` and call its methods.
            *   This implies creating `FeedService` if it doesn't fully exist as a layer over `FeedRepository` for all used methods.
    3.  **Eliminate Singleton `getInstance()` for Services within `ServiceProvider`**:
        *   `ConfigService` and `PluginService` are currently singletons accessed via `getInstance()`. `ServiceProvider` should instantiate them like other services and manage their lifecycle. This improves testability and makes dependencies explicit.
        *   **Change in `ServiceProvider`**:
            ```typescript
            // backend/src/utils/service-provider.ts
            // Instead of: const configService = ConfigService.getInstance();
            // Do:
            // const configService = new ConfigService(/* dependencies like new repos */);
            // this.services.set("configService", configService);
            // Similarly for PluginService, ensuring its dependencies (like ConfigService) are injected.
            ```
        *   Services consuming these (e.g., `PluginService` consuming `ConfigService`) would then receive them via constructor injection from `ServiceProvider`.

## 2. Repository and Service Consistency

*   **Issue**: `LeaderboardRepository` and `ActivityRepository` both have methods related to leaderboards/ranking.
*   **Recommendation**:
    *   Review the exact logic in `ActivityRepository.getLeaderboard()` and `LeaderboardRepository.getLeaderboard()`.
    *   If they serve distinct purposes (e.g., one is for feed-specific activity points, another is for global submission-based leaderboards), ensure their naming and documentation clearly reflect this.
    *   If there's significant overlap, consolidate the logic into one repository or a shared utility, with clear methods for different leaderboard types. The `ActivityService` should then be the primary consumer for leaderboard-related features.

*   **Issue**: `UserService` directly uses `this.dbConnection` (which is `DatabaseConnection`) for transactions, while repositories use the `DB` (Drizzle instance) passed to them.
*   **Recommendation**:
    *   Standardize on passing the Drizzle `DB` instance for operations.
    *   If `DatabaseConnection` is a wrapper to manage read/write replicas or advanced transaction control, its role should be clear. For typical service-repository interactions, passing the Drizzle `db` instance (or a transaction-specific `txDb`) to repositories is common.
    *   `UserService` should ideally delegate all database operations, including transactional boundaries if complex, to `UserRepository`. If `UserService` needs to orchestrate a transaction across multiple repository calls, it can obtain a transaction from `this.db.transaction(async (tx) => { ... })` and pass `tx` to repository methods.

## 3. Configuration Access

*   **Issue**: `UserService` directly accesses `process.env` for NEAR credentials.
*   **Recommendation**:
    *   These credentials should be part of `AppConfig.global` (or a new dedicated section like `AppConfig.integrations.near`).
    *   `ConfigService` (once refactored to be DB-backed) would provide these values.
    *   Inject the necessary configuration values into `UserService` via its constructor (managed by `ServiceProvider`). This centralizes configuration access and improves testability.

## 4. Lifecycle Management for Background Tasks

*   **Issue**: `backend/src/index.ts` calls `context.submissionService.startMentionsCheck()`. The `context` object and how services with background tasks are managed isn't fully clear from `ServiceProvider` or `app.ts`.
*   **Recommendation**:
    1.  If `SubmissionService` (or any other service like a hypothetical `TwitterService`) needs to run background tasks (polling, subscriptions):
        *   It should have explicit `start()` and `stop()` methods.
        *   `ServiceProvider` should be aware of such "startable" services.
        *   In `backend/src/index.ts` (or `app.ts` during setup), after `ServiceProvider` is initialized, iterate through registered services that implement a specific interface (e.g., `IBackgroundTaskService`) and call their `start()` method.
        *   The graceful shutdown logic in `index.ts` should similarly call their `stop()` methods.
    2.  The `AppInstance` type in `backend/src/types/app.ts` is just `{ app: Hono<Env> }`. If `index.ts` needs access to specific service instances (like `submissionService` for `startMentionsCheck`), `createApp` should return them, or `ServiceProvider` should be used in `index.ts` to retrieve them.
        *   **Preferred**: `index.ts` uses `ServiceProvider.getInstance().getSubmissionService().startMentionsCheck()`.

## 5. Error Handling Consistency

*   **Current State**: Generally good with custom error types and logging. `db/utils.ts` provides `withErrorHandling`.
*   **Recommendation**:
    *   Ensure all service methods that can fail (especially those involving I/O or external calls) use a consistent error handling strategy, potentially leveraging a refined `withErrorHandling` or similar pattern to wrap errors into service-specific or domain-specific errors.
    *   API route handlers should consistently map service errors to appropriate HTTP responses.

## 6. Asynchronous Configuration Loading

*   **Issue**: Migrating `ConfigService` to be DB-backed will likely make `configService.getConfig()` asynchronous. Synchronous access `configService.getConfig()` in `ServiceProvider` constructor for `appConfig` will no longer work directly.
*   **Recommendation**:
    1.  `ConfigService.loadConfig()` should be called once at application startup (e.g., in `app.ts` before other services that depend on `AppConfig` are initialized).
        ```typescript
        // backend/src/app.ts
        export async function createApp(): Promise<AppInstance> {
          const initialConfigService = new ConfigService(/* inject repos */); // Or get from a preliminary SP
          const appConfig = await initialConfigService.loadConfig(); // Load and cache initially
        
          // Now initialize the main ServiceProvider with the loaded appConfig
          ServiceProvider.initialize(dbInstance, appConfig); 
          // ... rest of app setup
        }
        ```
    2.  `ServiceProvider` would then receive the pre-loaded `appConfig` in its constructor (or `initialize` method) and pass it to services that need it, allowing them to access it synchronously from their already loaded copy.
    3.  For dynamic updates, `ConfigService` would still have its `invalidateCache` and async `getConfig` (which reloads if cache is stale/invalidated). Services needing the absolute latest config dynamically could call the async version, but most can operate on the startup-loaded config.

## 7. Code Structure and Clarity

*   **`backend/src/services/db/index.ts`**: Currently exports both the `db` instance and instances of all repositories.
    *   **Recommendation**: Consider if `ServiceProvider` should be the sole provider of repository instances as well. This would mean services request repositories from `ServiceProvider` (or have them injected) rather than importing them directly from `services/db/repositories`. This centralizes instance management but adds a layer of indirection. For now, direct injection of repositories into services by `ServiceProvider` (as done for `UserService` and `ActivityService`) is a good pattern.
*   **Type Imports**: Some files use relative paths like `../../types/app` while others might use path aliases if configured in `tsconfig.json`.
    *   **Recommendation**: Ensure `tsconfig.json` `paths` are set up for cleaner imports (e.g., `@/services/*`, `@/types/*`) and use them consistently. (Current `tsconfig.json` has `"*": ["src/*"]`, which is good).
*   **Logging**: Consistent use of `logger` is good. Ensure log messages are informative and include relevant context (e.g., user IDs, feed IDs, error codes) for easier debugging.

## 8. File Deletion/Heavy Refactor

*   **`curate.config.json` and `test/curate.config.test.json`**: Once configuration is fully DB-driven, these files will primarily serve as templates for initial seeding or as backups. They will no longer be directly read by `ConfigService` at runtime.
*   **`ConfigService.ts`**: Will undergo significant refactoring as detailed in `config_migration_recommendations.md`.

By addressing these points, the backend codebase will become more robust, maintainable, testable, and easier to evolve.
