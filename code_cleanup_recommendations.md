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

## 2. Repository and Service Consistency - COMPLETED

**Status: COMPLETED**

**Summary of Changes & Observations:**

*   **Leaderboard/Activity Repository Methods**:
    *   `ActivityRepository.getLeaderboard()` was renamed to `getUserRankingLeaderboard()` to clarify its purpose (user ranking by points/activity).
    *   `LeaderboardRepository.getLeaderboard()` was renamed to `getCuratorStatsLeaderboard()` to clarify its purpose (curator-specific statistics).
    *   `ActivityService` was updated to use these new method names and to be the primary consumer for both types of leaderboard data. It now depends on both `ActivityRepository` and `LeaderboardRepository` (with `DB` instance also injected for transactions).
    *   Relevant interfaces (`IActivityService`), service provider (`ServiceProvider`), and route handlers (`routes/api/activity.ts`) were updated.
    *   A TODO item was added to `TECH_DEBT_TODO.md` to consider consolidating `LeaderboardRepository`'s logic into `ActivityRepository` in the future.

*   **UserService Database Interactions**:
    *   The issue regarding `UserService` using a separate `dbConnection` for transactions appears to be outdated or already resolved.
    *   Current `UserService` implementation correctly uses an injected Drizzle `DB` instance (`this.db`) to manage transactions (e.g., `this.db.transaction(async (tx) => ...)`) and passes the transactional `tx` object to `UserRepository` methods for database operations (`createUser`, `updateUser`, `deleteUser`).
    *   This aligns with the recommended practice of services orchestrating transactions and repositories operating within the provided transaction context.

## 3. Configuration Access - COMPLETED

**Status: COMPLETED**

**Summary of Changes Made:**
*   Introduced `NearIntegrationConfigSchema` and `IntegrationsConfigSchema` in `backend/src/types/config.zod.ts`.
*   Added an optional `integrations: IntegrationsConfigSchema.optional()` field to `AppConfigSchema` in `backend/src/types/config.zod.ts`.
*   Updated `backend/test/curate.config.test.json` to include an `integrations.near` section with placeholders for environment variables (e.g., `{NEAR_PARENT_ACCOUNT_ID}`). This allows `ConfigService` and `hydrateConfigValues` to load these values into `AppConfig`.
*   Modified `UserService` (`backend/src/services/users.service.ts`):
    *   The constructor now accepts `nearConfig: NearIntegrationConfig` as a parameter.
    *   Internal logic for NEAR account creation and deletion now uses values from the injected `nearConfig` object (e.g., `this.nearConfig.parentAccountId`, `this.nearConfig.parentKeyPair`, `this.nearConfig.networkId`, and optional URLs) instead of directly accessing `process.env`.
*   Updated `ServiceProvider` (`backend/src/utils/service-provider.ts`):
    *   It now retrieves `appConfig.integrations?.near`.
    *   It passes this `nearIntegrationConfig` to the `UserService` constructor during instantiation.
    *   Includes a check to ensure `nearIntegrationConfig` is present, throwing an error if it's missing, as it's a required dependency for `UserService`.

**Original Recommendation Details (for historical reference):**
*   **Issue**: `UserService` directly accesses `process.env` for NEAR credentials.
*   **Recommendation**:
    *   These credentials should be part of `AppConfig.global` (or a new dedicated section like `AppConfig.integrations.near`).
    *   `ConfigService` (once refactored to be DB-backed) would provide these values.
    *   Inject the necessary configuration values into `UserService` via its constructor (managed by `ServiceProvider`). This centralizes configuration access and improves testability.

## 4. Lifecycle Management for Background Tasks - COMPLETED (with known issue)

**Status: COMPLETED (with known issue)**

**Summary of Changes Made:**
*   Introduced `IBackgroundTaskService` interface (`backend/src/services/interfaces/background-task.interface.ts`) with `start(): Promise<void>` and `stop(): Promise<void>` methods.
*   `SourceService` (`backend/src/services/source.service.ts`) now implements `IBackgroundTaskService`:
    *   Its constructor was updated to accept `InboundService` and `AppConfig`.
    *   The `start()` method initializes polling for each enabled feed based on `feedConfig.pollingIntervalMs` (defaults to 5 minutes). It fetches items using `fetchAllSourcesForFeed` and passes them to `inboundService.processInboundItems`.
    *   The `fetchFromSearchConfig` method within `SourceService` was enhanced to include robust asynchronous job polling logic. It now checks `nextLastProcessedState` for job statuses (e.g., `submitted`, `pending`, `processing`, `done`, `error`) and re-queries the plugin with delays if an async job is ongoing, making it more resilient with plugins that perform long-running operations.
    *   The `stop()` method clears all polling intervals and calls the existing `shutdown()` method.
*   `FeedConfigSchema` in `backend/src/types/config.zod.ts` was updated to include optional `enabled: z.boolean().default(true)` and `pollingIntervalMs: z.number().int().positive()`.
*   `ServiceProvider` (`backend/src/utils/service-provider.ts`):
    *   Updated to correctly instantiate `SourceService` with its new dependencies.
    *   Added `getBackgroundTaskServices(): IBackgroundTaskService[]` method, which currently uses duck-typing (checks for `start` and `stop` methods and `instanceof SourceService`) to find background task services. A TODO should be added to make this more robust (e.g., explicit registration).
*   `backend/src/index.ts` was refactored:
    *   It now retrieves the `ServiceProvider` instance (`sp`) after `createApp()` (which initializes `sp`).
    *   Service access was changed from `context.someService` to `sp.getSomeService()`.
    *   The old `context.submissionService.startMentionsCheck()` call was removed.
    *   It now calls `sp.getBackgroundTaskServices()` and iterates through the returned services, calling `start()` on each during server startup.
    *   The graceful shutdown logic now also uses `sp.getBackgroundTaskServices()` to call `stop()` on all background task services. Specific shutdown calls for other services like `DistributionService` are preserved if they are not `IBackgroundTaskService`.
    *   The health check route was updated to use `sp` for service status.

**Known Issue:**
*   There is a persistent TypeScript error in `backend/src/services/source.service.ts` at the `plugin.search(...)` call: `"Expected 5 arguments, but got 4."`
    *   The actual call `plugin.search(lastState, searchOptions)` provides 2 arguments, which matches the `SourcePlugin` interface definition for the `search` method.
    *   This error is likely misleading or due to a deeper TypeScript inference issue, conflicting type definitions, or a language server problem. The call signature appears correct as per the provided type definitions. Further investigation on the TypeScript environment or specific plugin type interactions may be needed.

**Original Recommendation Details (for historical reference):**
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
