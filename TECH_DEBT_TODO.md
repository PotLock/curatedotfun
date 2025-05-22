# Technical Debt & Future Considerations TODO

This file lists miscellaneous technical debt items, potential improvements, and areas for future consideration identified during refactoring and analysis.

## DI and Service Layer
-   **Enhance `FeedService.getSubmissionsByFeed` for Status Filtering**:
    -   Currently, `backend/src/routes/api/submission.ts` (specifically the `/feed/:feedId` route) fetches all submissions for a feed via `FeedService.getSubmissionsByFeed` and then filters them by status in the route handler if a status query parameter is provided.
    -   **Recommendation**: Consider moving the status filtering logic into `FeedService.getSubmissionsByFeed` itself. The method could accept an optional `status` parameter. This would make the service method more versatile and keep the route handler cleaner.
    -   *File affected: `backend/src/services/feed.service.ts`, `backend/src/routes/api/submission.ts`*

-   **Type Safety in `FeedService.processFeed` for Distributor Config**:
    -   In `backend/src/services/feed.service.ts`, within the `processFeed` method, there's a `TODO: Type 'any' for d` comment:
        ```typescript
        streamConfig.distribute = streamConfig.distribute?.filter((d: any) => // TODO: Type 'any' for d
          validDistributors.includes(d.plugin),
        );
        ```
    -   **Recommendation**: Replace `any` with the correct type for the distributor configuration object (`DistributorConfig` from `../types/config.zod`).
    -   *File affected: `backend/src/services/feed.service.ts`*

-   **Review `AppInstance` type and `context` usage in `index.ts`**:
    -   The `AppInstance` type in `backend/src/types/app.ts` is currently just `{ app: Hono<Env> }`.
    -   `backend/src/index.ts` accesses `context.twitterService`, `context.submissionService`, etc. It's not immediately clear if `createApp()` in `app.ts` is returning this `context` object as part of `AppInstance` or if these services are accessed via `ServiceProvider.getInstance()` within `index.ts`.
    -   **Recommendation**: Clarify how services with background tasks (like `SubmissionService.startMentionsCheck`) are accessed and managed at the application's entry point (`index.ts`). Ensure `AppInstance` accurately reflects what `createApp` returns and how `index.ts` consumes it. This relates to Section 4 ("Lifecycle Management for Background Tasks") of the original `code_cleanup_recommendations.md`.
    -   *Files affected: `backend/src/types/app.ts`, `backend/src/index.ts`, `backend/src/app.ts`*

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

## Repository Layer
-   **Consolidate Leaderboard Repositories**:
    -   **Issue**: `LeaderboardRepository` and `ActivityRepository` both contain leaderboard-related logic. `ActivityRepository` handles user ranking based on points/activity, while `LeaderboardRepository` focuses on curator-specific statistics.
    -   **Recommendation**: Consolidate `LeaderboardRepository` logic into `ActivityRepository` and remove `LeaderboardRepository`. Their functionalities are closely related to user activities and stats. `ActivityService` would then only depend on `ActivityRepository` for all leaderboard/ranking features. This would simplify dependencies and centralize activity/ranking data access.
    -   *Files affected: `backend/src/services/db/repositories/activity.repository.ts`, `backend/src/services/db/repositories/leaderboard.repository.ts`, `backend/src/services/activity.service.ts`, `backend/src/utils/service-provider.ts`, `backend/src/services/db/index.ts`*
