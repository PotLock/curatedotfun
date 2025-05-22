# Curatedotfun Backend Architecture & Data Flow Analysis

This document provides an overview of the backend architecture for the `curatedotfun` platform, based on the provided source code.

## 1. Overall Architecture

The backend is a Node.js application built with the Hono.js web framework and TypeScript. It follows a service-oriented architecture with distinct layers for API handling, business logic (services), data access (repositories), and a dynamic plugin system. An external scheduler is used for background tasks.

The key components are:

*   **API Layer (Hono.js)**: Exposes HTTP endpoints for frontend and external interactions (e.g., scheduler callbacks).
*   **Service Layer**: Contains the core business logic, with services dedicated to specific domains like submissions, users, plugins, processing, etc. Managed by a `ServiceProvider`.
*   **Data Layer (Drizzle ORM & PostgreSQL)**: Handles all database interactions, including schema definition, migrations (via Drizzle Kit), repositories for data access, and utility functions.
*   **Plugin System (Module Federation)**: Allows dynamic loading and execution of external plugins for sourcing content, transforming it, and distributing it.
*   **Configuration Service**: Manages application-wide and feed-specific configurations.
*   **Scheduler Integration**: Interacts with an external scheduler service to manage and trigger background jobs like content ingestion and recap generation.
*   **NEAR Blockchain Integration**: Manages user accounts on the NEAR blockchain.

```mermaid
graph TD
    subgraph External
        UserAgent[User Agent / Client App]
        ExternalScheduler[External Scheduler Service]
        ExternalPlugins[External Plugin Modules]
    end

    subgraph BackendApplication [curate.fun Backend]
        APILayer[API Layer (Hono.js)]
        Middleware[Middleware (Auth, CORS, Error Handling)]
        ServiceProvider[ServiceProvider]
        
        subgraph Services
            ConfigService[ConfigService]
            PluginService[PluginService]
            UserService[UserService]
            ActivityService[ActivityService]
            SourceService[SourceService]
            AdapterService[AdapterService]
            InboundService[InboundService]
            SubmissionService[SubmissionService]
            ProcessorService[ProcessorService]
            TransformationService[TransformationService]
            DistributionService[DistributionService]
            SchedulerService[SchedulerService]
        end

        subgraph DataAccessLayer [Data Access Layer]
            Repositories[Repositories (Feed, User, Submission, etc.)]
            DrizzleORM[Drizzle ORM]
            DBUtils[DB Utilities (queries, retry)]
            Database[PostgreSQL Database]
        end
    end

    UserAgent -->|HTTP Requests| APILayer
    APILayer -->|Uses| Middleware
    APILayer -->|Gets Services via| ServiceProvider
    Middleware -->|Modifies Context/Request| APILayer

    ServiceProvider -->|Instantiates & Provides| Services
    Services -->|Interact with each other| Services
    Services -->|Use| Repositories
    
    PluginService -->|Loads| ExternalPlugins
    SourceService -->|Uses Source Plugins via| PluginService
    TransformationService -->|Uses Transformer Plugins via| PluginService
    DistributionService -->|Uses Distributor Plugins via| PluginService

    Repositories -->|Execute Queries via| DrizzleORM
    DrizzleORM -->|Interacts with| Database
    Repositories -->|Use| DBUtils

    SchedulerService -->|Manages Jobs with| ExternalScheduler
    ExternalScheduler -->|Triggers Jobs via HTTP Callbacks to| APILayer

    UserService -->|Interacts for Account Management| NEARBlockchain[(NEAR Blockchain)]

    %% Service Interactions Example (Ingestion & Processing)
    SchedulerService --> SourceService
    SourceService --> AdapterService
    AdapterService --> InboundService
    InboundService --> SubmissionService
    SubmissionService --> ProcessorService
    ProcessorService --> TransformationService
    ProcessorService --> DistributionService
```

## 2. Data Layer

The data layer uses PostgreSQL as the database and Drizzle ORM for type-safe database interactions.

### 2.1. Database Schema (`services/db/schema.ts`, `services/db/schema/*.ts`)

Key tables include:

*   **`users`**: Stores user information, including `auth_provider_id` (Web3Auth), `near_account_id`, `near_public_key`, `username`, `email`, and a JSONB `data` column for `Profile` (name, description, images, linktree).
*   **`feeds`**: Stores feed configurations. Each feed has an `id`, `name`, `description`, and a JSONB `config` column holding the detailed `FeedConfig` (moderation rules, sources, outputs like stream/recap).
*   **`submissions`**: Contains submitted content, including `tweetId` (primary key, often the external ID of the content), `userId` (original author), `username`, `curatorId`, `curatorUsername`, `curatorTweetId` (ID of the curator's action), `content`, `curatorNotes`, and timestamps.
*   **`submissionFeeds`**: A join table linking `submissions` to `feeds`. It stores the `status` of a submission within a specific feed (e.g., `pending`, `approved`, `rejected`) and `moderationResponseTweetId`.
*   **`moderationHistory`**: Logs moderation actions (`adminId`, `action`, `note`) for a `tweetId` within a `feedId`.
*   **`activities`**: Tracks various user activities like content submissions, approvals, token events. Links to `users`, `feeds`, `submissions`. Contains JSONB `data` and `metadata`.
*   **`userStats`**: Aggregated global statistics for users (total submissions, approvals, points).
*   **`feedUserStats`**: User statistics specific to a feed (submission count, approval count, points, ranks).
*   **`feedRecapsState`**: Tracks the state of recap generation jobs for feeds, including `externalJobId` from the scheduler and `lastSuccessfulCompletion`.
*   **`feedPlugins`**: Associates feeds with plugins and their specific configurations (as a JSON string).
*   **`lastProcessedStateTable`**: Stores the last processed state for source plugins (keyed by `feedId`, `sourcePluginName`, `searchId`) to enable incremental fetching. Contains a JSONB `stateJson`.
*   **`submissionCounts`**: Tracks daily submission counts per user to enforce limits.

### 2.2. Repositories (`services/db/repositories/*.ts`)

Repositories provide an abstraction layer for accessing data. Each repository is typically responsible for a specific entity or group of related entities. They use Drizzle ORM for queries and often utilize shared functions from `queries.ts` and `utils.ts`.

*   **`ActivityRepository`**: Manages `activities`, `userStats`, `feedUserStats`.
    *   `createActivity(data: { user_id: number; type: ActivityType; feed_id?: string | null; submission_id?: string | null; data?: Record<string, any> | null; metadata?: Record<string, any> | null; }, txDb: DB)`
    *   `getUserActivities(userId: number, options: { limit?: number; offset?: number; types?: ActivityType[]; feed_id?: string; from_date?: string; to_date?: string; })`
    *   `getLeaderboard(options: { time_range?: string; feed_id?: string; limit?: number; })`
    *   `getGlobalStats()`
    *   `getUserStats(userId: number)`
    *   `updateUserStats(userId: number, data: { total_submissions?: number; total_approvals?: number; total_points?: number; data?: Record<string, any>; metadata?: Record<string, any>; }, txDb: DB)`
    *   `getFeedUserStats(userId: number, feedId: string)`
    *   `updateFeedUserStats(userId: number, feedId: string, data: { submissions_count?: number; approvals_count?: number; points?: number; curator_rank?: number; approver_rank?: number; data?: Record<string, any>; metadata?: Record<string, any>; }, txDb: DB)`
*   **`FeedRepository`**: Manages `feeds`, `feedRecapsState`, `submissionFeeds`.
    *   `getFeedById(feedId: string): Promise<SelectFeedData | null>`
    *   `getAllFeeds(): Promise<SelectFeedData[]>`
    *   `createFeed(data: InsertFeedData, txDb: DB): Promise<SelectFeedData>`
    *   `updateFeed(feedId: string, data: UpdateFeedData, txDb: DB): Promise<SelectFeedData | null>`
    *   `getFeedConfig(feedId: string): Promise<FeedConfig | null>`
    *   `getAllFeedConfigs(): Promise<FeedConfig[]>`
    *   `getRecapState(feedId: string, recapId: string): Promise<RecapState | null>`
    *   `upsertRecapState(stateData: { feedId: string; recapId: string; externalJobId: string; lastSuccessfulCompletion: Date | null; lastRunError: string | null; }, txDb: DB): Promise<RecapState>`
    *   `updateRecapCompletion(feedId: string, recapId: string, timestamp: Date, txDb: DB): Promise<void>`
    *   `updateRecapError(feedId: string, recapId: string, errorMsg: string, txDb: DB): Promise<void>`
    *   `getSubmissionsByFeed(feedId: string): Promise<Submission[]>`
    *   `getApprovedSubmissionsSince(feedId: string, sinceTimestamp: Date | null): Promise<ApprovedSubmission[]>` (Method inferred from `SchedulerService` usage)
*   **`LastProcessedStateRepository`**: Manages `lastProcessedStateTable`.
    *   `getState<T extends PlatformState>(feedId: string, sourcePluginName: string, searchId: string): Promise<LastProcessedState<T> | null>`
    *   `saveState<T extends PlatformState>(feedId: string, sourcePluginName: string, searchId: string, state: LastProcessedState<T>, txDb: DB): Promise<void>`
    *   `deleteState(feedId: string, sourcePluginName: string, searchId: string, txDb: DB): Promise<void>`
*   **`LeaderboardRepository`**: Specialized for generating leaderboard data.
    *   `getLeaderboard(timeRange: string = "all"): Promise<queries.LeaderboardEntry[]>`
*   **`SubmissionRepository`**: Manages `submissions`, `moderationHistory`, `submissionCounts`.
    *   `saveSubmission(submission: Submission, txDb: DB): Promise<void>`
    *   `saveModerationAction(moderation: Moderation, txDb: DB): Promise<void>`
    *   `getSubmission(tweetId: string): Promise<Submission | null>`
    *   `getSubmissionByCuratorTweetId(curatorTweetId: string): Promise<Submission | null>`
    *   `getAllSubmissions(status?: string): Promise<SubmissionWithFeedData[]>`
    *   `getDailySubmissionCount(userId: string): Promise<number>`
    *   `incrementDailySubmissionCount(userId: string, txDb: DB): Promise<void>`
*   **`UserRepository`**: Manages `users` table.
    *   `findByAuthProviderId(auth_provider_id: string): Promise<SelectUser | null>`
    *   `findByNearAccountId(near_account_id: string): Promise<SelectUser | null>`
    *   `createUser(userData: InsertUser, txDb: DB): Promise<SelectUser>`
    *   `updateUser(auth_provider_id: string, userData: UpdateUser, txDb: DB): Promise<SelectUser | null>`
    *   `deleteUser(auth_provider_id: string, txDb: DB): Promise<boolean>`

### 2.3. DB Utilities

*   **`services/db/queries.ts`**: Contains reusable query functions (e.g., `upsertFeeds`, `saveSubmissionToFeed`, `getModerationHistory`).
*   **`services/db/utils.ts`**: Provides `executeWithRetry` for resilient DB operations and `withErrorHandling` for standardized error logging.

## 3. Service Layer (`services/*.ts`)

Services encapsulate the core business logic and are managed by the `ServiceProvider`.

*   **`ConfigService`**: (Singleton) Loads and provides access to application configuration (`AppConfig`) from a JSON file. Handles environment-specific paths and config hydration.
    *   `getInstance()`
    *   `loadConfig(): Promise<AppConfig>`
    *   `getConfig(): AppConfig`
    *   `getFeedConfig(feedId: string): FeedConfig | undefined`
    *   `getPluginByName(pluginName: string): PluginRegistrationConfig | undefined`

*   **`PluginService`**: (Singleton) Manages the lifecycle of dynamically loaded plugins (source, transformer, distributor) using Module Federation. Handles loading, initialization, caching, endpoint registration (if plugin provides HTTP endpoints), and cleanup.
    *   `getInstance()`
    *   `setApp(app: Hono)`: For registering plugin endpoints.
    *   `getPlugin<T extends PluginType, TInput, TOutput, TConfig extends Record<string, unknown>>(name: string, pluginConfig: { type: T; config: TConfig }): Promise<PluginTypeMap<TInput, TOutput, TConfig>[T]>`
    *   `reloadAllPlugins(): Promise<void>`
    *   `cleanup(): Promise<void>`

*   **`UserService`**: Manages user creation (including NEAR account provisioning), updates, deletion, and retrieval.
    *   `findUserByAuthProviderId(auth_provider_id: string): Promise<SelectUser | null>`
    *   `createUser(data: InsertUser): Promise<SelectUser>`
    *   `updateUser(auth_provider_id: string, data: UpdateUser): Promise<SelectUser | null>`
    *   `deleteUser(auth_provider_id: string): Promise<boolean>`

*   **`ActivityService`**: Handles user activities, statistics, and leaderboards.
    *   `createActivity(data: InsertActivityData): Promise<SelectActivity>`
    *   `getUserActivities(userId: number, options?: ActivityQueryOptions): Promise<SelectActivity[]>`
    *   `getLeaderboard(options?: LeaderboardQueryOptions): Promise<LeaderboardEntry[]>`
    *   `getGlobalStats(): Promise<GlobalStats>`
    *   (Other stat-related methods for `userStats` and `feedUserStats`)

*   **`SourceService`**: Fetches content from external sources using source plugins. Manages `LastProcessedState` for incremental fetching.
    *   `fetchAllSourcesForFeed(feedConfig: FeedConfig): Promise<SourceItem[]>`
    *   `fetchFromSource(feedId: string, sourceConfig: SourceConfig): Promise<SourceItem[]>` (private `fetchFromSearchConfig` is the core worker here)

*   **`AdapterService`**: Transforms raw `SourceItem`s (from `SourceService`) into structured `AdaptedItem`s (content, submission commands, moderation commands).
    *   `adaptItem(sourceItem: SourceItem, feedConfig: FeedConfig, searchId: string): AdaptedItem`

*   **`InboundService`**: Processes `AdaptedItem`s. "Stitches" pending submission commands with their target content and routes items to `SubmissionService`.
    *   `processInboundItems(sourceItems: SourceItem[], feedConfig: FeedConfig): Promise<void>`

*   **`SubmissionService`**: Manages the lifecycle of submissions: creation, association with feeds, moderation. Interacts with `ProcessorService` for approved content. (Note: Constructor in `ServiceProvider` differs from original analysis, using `processorService`, `appConfig`).
    *   `handleSubmission(newSubmission: Submission, targetFeedId: string, platformKey: string): Promise<void>`
    *   `handleModeration(command: ModerationCommandData, targetFeedId: string, platformKey: string): Promise<void>`

*   **`TransformationService`**: Applies a series of transformations to content using transformer plugins.
    *   `applyTransforms(content: any, transforms: TransformConfig[], stage: TransformStage): Promise<any>`

*   **`DistributionService`**: Distributes processed content to output channels using distributor plugins. Skips distribution in staging.
    *   `distributeContent<T>(distributor: DistributorConfig, input: T): Promise<void>`

*   **`ProcessorService`**: Orchestrates the content processing pipeline (transformation and distribution) for single items or batches.
    *   `process(content: any, config: ProcessConfig): Promise<void>`
    *   `processBatch(items: any[], config: ProcessConfig & { batchTransform?: TransformConfig[] }): Promise<void>`

*   **`SchedulerService`**: Manages scheduled jobs (feed ingestion, recaps) by interacting with an external scheduler service. Defines job configurations and triggers local service methods (e.g., `SourceService.fetchAllSourcesForFeed`, `ProcessorService.processBatch`) when jobs are executed via HTTP callbacks.
    *   `initialize(): Promise<void>`
    *   `syncFeedSchedules(feedId: string): Promise<void>`
    *   `runRecapJob(feedId: string, recapId: string): Promise<void>` (triggered by API)
    *   `processFeedSources(feedId: string): Promise<void>` (triggered by API)

### 3.1. ServiceProvider (`utils/service-provider.ts`)

A singleton class that instantiates and provides access to all major services and repositories. It helps manage dependencies between services. Services are typically retrieved in route handlers or other services via `ServiceProvider.getInstance().getSomeService()`.

## 4. API Layer (`routes/api/`)

The API is built with Hono.js. `routes/api/index.ts` aggregates sub-routers for different resources.

*   **Middleware**:
    *   Database instance and `ServiceProvider` are initialized and made available (though direct context injection of services to routes isn't consistently used; `ServiceProvider.getInstance()` is common).
    *   `web3AuthJwtMiddleware`: Handles JWT authentication.
    *   `secureHeaders`: Adds security-related HTTP headers.
    *   `cors`: Manages Cross-Origin Resource Sharing.
    *   Global error handler.
*   **Route Structure**:
    *   `/api/users`: User management (get profile, create, update, delete). Requires authentication.
    *   `/api/feeds`: Feed management (list, create, get, update, get submissions for feed, process approved submissions for a feed).
    *   `/api/submissions`: Submission retrieval (list all with pagination/status, get single, get by feed).
    *   `/api/activity`: Activity and stats retrieval.
    *   `/api/leaderboard`: Leaderboard data.
    *   `/api/config`: (Likely for fetching parts of the app config).
    *   `/api/plugins`: e.g., `POST /reload` to reload all plugins.
    *   `/api/stats`: (Likely for global application stats).
    *   `/api/trigger`: Endpoints called by the external scheduler:
        *   `POST /ingest/:feedId` -> `SchedulerService.processFeedSources`
        *   `POST /recap` -> `SchedulerService.runRecapJob`
    *   `/api/twitter`: (Details not fully analyzed).
    *   `/api/test`: (Development only routes).
*   **Request Handling**: Route handlers typically validate requests (using `@hono/zod-validator`), handle authentication/authorization (checking `jwtPayload`), call appropriate service methods (often via `ServiceProvider`), and return JSON responses.

## 5. Key Data Flows

### 5.1. Content Ingestion (Scheduled)

1.  **Trigger**: External Scheduler calls `POST /api/trigger/ingest/:feedId`.
2.  **Route Handler**: Invokes `SchedulerService.processFeedSources(feedId)`.
3.  **Fetch (`SourceService`)**:
    *   `SchedulerService` calls `SourceService.fetchAllSourcesForFeed(feedConfig)`.
    *   `SourceService` iterates through `feedConfig.sources`. For each source:
        *   Loads the source plugin via `PluginService`.
        *   Retrieves `LastProcessedState` from `LastProcessedStateRepository`.
        *   Calls plugin's `search()` method.
        *   Saves `nextLastProcessedState`.
    *   Returns a list of raw `SourceItem`s.
4.  **Adapt & Process (`InboundService`)**:
    *   `SchedulerService` calls `InboundService.processInboundItems(sourceItems, feedConfig)`.
    *   `InboundService` uses `AdapterService.adaptItem()` to convert each `SourceItem` to an `AdaptedItem` (e.g., `AdaptedContentSubmission`, `AdaptedPendingSubmissionCommand`, `AdaptedModerationCommand`).
    *   `InboundService` "stitches" `AdaptedPendingSubmissionCommand`s with their target content if found in the same batch.
5.  **Handle (`SubmissionService`)**:
    *   `InboundService` calls `SubmissionService.handleSubmission()` or `SubmissionService.handleModeration()`.
    *   `SubmissionService` performs:
        *   Blacklist/limit checks.
        *   Database operations (save submission, link to feed, update status, log moderation) via `SubmissionRepository` and `FeedRepository` within a transaction.
        *   Auto-approval logic if submitted/moderated by an authorized feed moderator.

### 5.2. Content Processing and Distribution (Stream Output)

This flow is typically triggered after a submission is approved within `SubmissionService.handleSubmission` or `SubmissionService.handleModeration`.

1.  **Trigger (`SubmissionService`)**: If an approved submission's feed has `outputs.stream.enabled = true`.
    *   `SubmissionService` calls `ProcessorService.process(approvedSubmission, feedConfig.outputs.stream)`.
2.  **Process (`ProcessorService`)**:
    *   **Global Transforms**: `ProcessorService` calls `TransformationService.applyTransforms(submission, streamConfig.transform, "global")`.
        *   `TransformationService` loads and executes each configured global transformer plugin via `PluginService`.
    *   **Distribution Loop**: For each `distributorConfig` in `streamConfig.distribute`:
        *   **Distributor Transforms**: `ProcessorService` calls `TransformationService.applyTransforms(globallyTransformedContent, distributorConfig.transform, "distributor")`.
        *   **Distribute**: `ProcessorService` calls `DistributionService.distributeContent(distributorConfig, distributorTransformedContent)`.
            *   `DistributionService` loads the distributor plugin via `PluginService`.
            *   Calls plugin's `distribute()` method (skipped in staging).

### 5.3. User Creation

1.  **Request**: Client sends `POST /api/users` with profile data. JWT middleware authenticates.
2.  **Route Handler (`routes/api/users.ts`)**:
    *   Validates request body.
    *   Extracts `authProviderId` from JWT.
    *   Calls `ServiceProvider.getInstance().getUserService().createUser(userData)`.
3.  **Service (`UserService.createUser`)**:
    *   **NEAR Account Creation**: Interacts with `near-api-js` to create a new sub-account on the NEAR blockchain, funded by a parent account (credentials from env vars). Adds the user's public key.
    *   **DB User Creation**: Within a DB transaction, calls `UserRepository.createUser()` to save user details (including NEAR account ID) to the database.
4.  **Response**: Returns the created user profile.

### 5.4. Recap Generation (Scheduled)

1.  **Trigger**: External Scheduler calls `POST /api/trigger/recap` with `{ feedId, recapId }`.
2.  **Route Handler**: Invokes `SchedulerService.runRecapJob(feedId, recapId)`.
3.  **Service (`SchedulerService.runRecapJob`)**:
    *   Fetches `FeedConfig` and the specific `RecapConfig`.
    *   Gets `RecapState` (including `lastSuccessfulCompletion`) from `FeedRepository`.
    *   Fetches approved submissions for the feed since `lastSuccessfulCompletion` via `FeedRepository`.
    *   If new submissions exist, calls `ProcessorService.processBatch(approvedSubmissions, recapConfig)`.
        *   `ProcessorService.processBatch` applies global transforms to each item, then applies `recapConfig.batchTransform` to the collection, then proceeds with per-distributor transforms and distribution similar to the stream flow.
    *   Updates `RecapState` (timestamp or error) in `FeedRepository`.

## 6. Configuration (`types/config.zod.ts`, `services/config.service.ts`)

*   **`AppConfig`**: The root configuration object, loaded by `ConfigService`. Contains:
    *   `global`: Global settings (bot ID, default status, limits, blacklist).
    *   `plugins`: A registry mapping plugin names to their `PluginRegistrationConfig` (type, URL, static config).
    *   `feeds`: An array of `FeedConfig` objects.
*   **`FeedConfig`**: Defines a single feed. Stored as JSONB in the `feeds` table. Contains:
    *   `id`, `name`, `description`.
    *   `moderation`: Approver lists, potentially per platform.
    *   `sources`: Array of `SourceConfig` for content ingestion.
        *   `SourceConfig`: Specifies a source `plugin`, its instance `config`, and an array of `search` blocks.
        *   `SourceSearchConfig`: Defines a specific search task (ID, type, query, pageSize, platformArgs).
    *   `ingestion`: Schedule for running source ingestion.
    *   `outputs`:
        *   `stream`: `StreamConfig` for real-time processing of approved items (transforms, distributors).
        *   `recap`: Array of `RecapConfig` for scheduled batch processing and distribution.
            *   `RecapConfig`: Defines schedule, transforms (item-level and batch-level), and distributors for a recap.
