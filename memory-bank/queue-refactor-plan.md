# Queue-Based Architecture Refactor Plan

This document outlines the plan to refactor the application to use a queue-based system for improved scalability, resilience, and responsiveness.

## Phase 1: Refactor Services into a Shared Package

The goal of this phase is to decouple the core business logic from the runtime environments (API vs. Worker).

1.  **Create `packages/core-services`**: Establish a new shared workspace package to house all business logic services.
2.  **Relocate Services**: Move all services from `apps/api/src/services` to the new `packages/core-services/src` directory.
3.  **Generalize `ServiceProvider`**:
    *   Move `apps/api/src/utils/service-provider.ts` to `packages/core-services/src/service-provider.ts`.
    *   Refactor the `ServiceProvider` to be a reusable factory. It will accept runtime-specific dependencies like the database connection, logger, and environment configurations during its initialization.
4.  **Update `apps/api`**: Modify the API application to import the `ServiceProvider` from `core-services` and initialize it with its specific runtime dependencies.
5.  **Update `apps/worker`**: Modify the worker application to also import and initialize the `ServiceProvider` from `core-services`, ensuring consistent access to business logic.

## Phase 2: Implement Asynchronous Queue-Based Workflow

With the shared services in place, this phase introduces the asynchronous processing flow.

1.  **Define New Queues**: Update `packages/shared-queue/src/queues.ts` to define two new queues:
    *   `MODERATION_QUEUE`: For handling all approval and rejection actions.
        *   **Payload**: `{ submissionId, feedId, action, moderatorAccountId, moderatorAccountIdType, source, note }`
    *   `SUBMISSION_PROCESSING_QUEUE`: For handling the long-running transformation and distribution process.
        *   **Payload**: `{ submissionId, feedId }`

2.  **Integrate Producers (in `apps/api`)**:
    *   The moderation API endpoint (`/moderate`) will be changed to produce a job for the `MODERATION_QUEUE` and return an immediate `202 Accepted` response.
    *   The `SubmissionService` will be updated to produce a job for the `MODERATION_QUEUE` when an auto-approval is triggered.

3.  **Create Consumers (in `apps/worker`)**:
    *   A new **Moderation Worker** will be created to consume jobs from the `MODERATION_QUEUE`. It will use the shared `ModerationService` to execute the core logic. Upon successful approval, it will produce a job for the `SUBMISSION_PROCESSING_QUEUE`.
    *   A new **Processing Worker** will be created to consume jobs from the `SUBMISSION_PROCESSING_QUEUE`. It will use the shared `ProcessorService` to execute the transformation and distribution pipeline.

### Architectural Diagram

```mermaid
graph TD
    subgraph "apps"
        A(apps/api)
        B(apps/worker)
    end

    subgraph "packages"
        C(packages/core-services)
        D(packages/shared-db)
        E(packages/shared-queue)
    end

    A --> C
    B --> C
    A --> E
    B --> E
    C --> D
