# Technical Debt & Future Considerations TODO

This file lists miscellaneous technical debt items, potential improvements, and areas for future consideration identified during refactoring and analysis.

## DI and Service Layer
-   **Enhance `FeedService.getSubmissionsByFeed` for Status Filtering**:
    -   Currently, `backend/src/routes/api/submission.ts` (specifically the `/feed/:feedId` route) fetches all submissions for a feed via `FeedService.getSubmissionsByFeed` and then filters them by status in the route handler if a status query parameter is provided.
    -   **Recommendation**: Consider moving the status filtering logic into `FeedService.getSubmissionsByFeed` itself. The method could accept an optional `status` parameter. This would make the service method more versatile and keep the route handler cleaner.
    -   *File affected: `backend/src/services/feed.service.ts`, `backend/src/routes/api/submission.ts`*

-   **Review `AppInstance` type and `context` usage in `index.ts`**:
    -   The `AppInstance` type in `backend/src/types/app.ts` is currently just `{ app: Hono<Env> }`.
    -   `backend/src/index.ts` accesses `context.twitterService`, `context.submissionService`, etc. It's not immediately clear if `createApp()` in `app.ts` is returning this `context` object as part of `AppInstance` or if these services are accessed via `ServiceProvider.getInstance()` within `index.ts`.
    -   **Recommendation**: Clarify how services with background tasks (like `SubmissionService.startMentionsCheck`) are accessed and managed at the application's entry point (`index.ts`). Ensure `AppInstance` accurately reflects what `createApp` returns and how `index.ts` consumes it. This relates to Section 4 ("Lifecycle Management for Background Tasks") of the original `code_cleanup_recommendations.md`.
    -   *Files affected: `backend/src/types/app.ts`, `backend/src/index.ts`, `backend/src/app.ts`*

-   **Robust Background Task Service Discovery in `ServiceProvider`**:
    -   `ServiceProvider.getBackgroundTaskServices()` currently uses duck-typing (checks for `start` and `stop` methods and `instanceof SourceService`) to find background task services.
    -   **Recommendation**: Implement a more robust mechanism, such as explicit registration of services that implement `IBackgroundTaskService` with the `ServiceProvider`. This could involve maintaining a separate list or using a decorator/metadata system if a more advanced DI framework were adopted.
    -   *Files affected: `backend/src/utils/service-provider.ts`, `backend/src/services/interfaces/background-task.interface.ts`*

## Type System & Errors
-   **Resolve `SubmissionServiceError` Import**:
    -   `backend/src/services/submission.service.ts` has a TypeScript error: `Module '"../types/errors"' has no exported member 'SubmissionServiceError'`.
    -   **Recommendation**: Investigate `backend/src/types/errors.ts` to ensure `SubmissionServiceError` is correctly defined and exported, or update the import if the name/location has changed.
    -   *Files affected: `backend/src/services/submission.service.ts`, `backend/src/types/errors.ts`*

-   **Resolve Feed Type Mismatches in `FeedService`**:
    -   `backend/src/services/feed.service.ts` has TypeScript errors related to `InsertFeed`/`UpdateFeed` types being incompatible with `InsertFeedData`/`UpdateFeedData` expected by `FeedRepository`.
        - Example: `Argument of type '{ id: string; config: { id: string; name: string; ... } }' is not assignable to parameter of type '{ id: string; config: { id: string; name: string; ... moderation: { approvers: { twitter: string[]; } } ... } }'`.
    -   **Recommendation**: Align the Zod-inferred types used in the service/routes (e.g., from `feed.validation.ts`) with the Drizzle-generated or manually defined types used in the repository layer. This might involve adjusting Zod schemas, database types, or using mappers.
    -   *Files affected: `backend/src/services/feed.service.ts`, `backend/src/validation/feed.validation.ts`, `backend/src/services/db/types.ts` (if manual types exist there), Drizzle schema files.*

-   **Resolve `PluginConfig` / `PluginsConfig` Import in `ConfigService`**:
    -   `backend/src/services/config.service.ts` has errors: `Module '"../types/config.zod"' has no exported member 'PluginConfig'` (and `PluginsConfig`).
    -   **Recommendation**: Verify the export names and paths from `backend/src/types/config.zod.ts`. It's possible these types are nested or named differently (e.g., part of `AppConfig`).
    -   *Files affected: `backend/src/services/config.service.ts`, `backend/src/types/config.zod.ts`*

## General
-   **Review TODO comments**:
    -   Search the codebase for `// TODO:` comments and evaluate if they represent actionable technical debt.
        - Example from `ServiceProvider`: `// TODO: Move services to injection, no singleton` (This specific one is now largely addressed for ConfigService/PluginService, but the comment might still be there).
        - Example from `ServiceProvider`: `// TODO: Inject repositories into other services as needed (e.g., submissionService might need SubmissionRepository)` (This was done for SubmissionService).
    -   **Recommendation**: Address or remove obsolete TODOs. Create new tickets/tasks for valid ones.

## Background Tasks / Polling
-   **Configurable Async Job Polling in `SourceService`**:
    -   In `backend/src/services/source.service.ts`, the `fetchFromSearchConfig` method uses hardcoded default values for `DEFAULT_ASYNC_JOB_POLLING_INTERVAL_MS` and `DEFAULT_MAX_ASYNC_JOB_POLLING_ATTEMPTS`.
    -   **Recommendation**: Consider making these polling parameters (interval and max attempts) configurable, potentially per plugin or per search configuration. This could be part of the `SourceSearchConfig` or `SourceConfig` in `config.zod.ts`.
    -   *Files affected: `backend/src/services/source.service.ts`, `backend/src/types/config.zod.ts`*
