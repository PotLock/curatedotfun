# Service Pattern Migration Checklist

## Overview

This document outlines the process for migrating existing backend services to follow the Controller -> Service -> Repository pattern as demonstrated by the users service implementation.

## Pattern Structure

The pattern consists of the following components:

1. **Validation Layer**
   - Zod schemas for request validation and type inference
   - Frontend and backend schema alignment

2. **Repository Layer**
   - Database operations using Drizzle ORM
   - Error handling and transaction management
   - Domain-specific database operations

3. **Service Interface Layer**
   - TypeScript interfaces defining service contracts
   - Type definitions derived from Zod schemas

4. **Service Implementation Layer**
   - Business logic implementation
   - Repository interaction
   - Error handling with custom error types
   - Data validation with Zod schemas

5. **Controller Layer**
   - Hono-based API routes
   - Request validation with Zod schemas
   - Error handling and response formatting
   - Service instantiation and dependency injection

## Migration Checklist

### Phase 1: Setup & Validation

1. **[ ] Define Zod Schemas**
   - Create/update `backend/src/validation/<entity>.validation.ts`
   - Define schemas for:
     - `insert<Entity>Schema` (data needed for creation, excluding auto-generated fields like ID, timestamps)
     - `update<Entity>Schema` (data allowed for updates, often making fields optional)
     - `select<Entity>Schema` (the shape of the entity returned from the DB/API, including ID, timestamps)
   - Create/update corresponding schemas in `frontend/src/lib/validation/<entity>.ts` for client-side use and type inference

2. **[ ] Define Service Interface**
   - Create `backend/src/services/interfaces/<entity>.interface.ts`
   - Define `I<Entity>Service` interface outlining the public methods the service will expose
   - Define specific input/output types (e.g., `Insert<Entity>Data`, `Update<Entity>Data`) derived from the Zod schemas

### Phase 2: Data Layer

3. **[ ] Create/Update Database Schema**
   - Ensure the database table schema (in `backend/src/services/db/schema.ts`) matches the `select<Entity>Schema`
   - Generate and apply migrations if necessary (`pnpm --filter backend drizzle:generate`, `pnpm --filter backend drizzle:migrate`)

4. **[ ] Create Repository**
   - Create `backend/src/services/db/repositories/<entity>.repository.ts`
   - Implement a `<Entity>Repository` class
   - Add methods for CRUD operations (e.g., `findBy<Field>`, `create<Entity>`, `update<Entity>`, `delete<Entity>`) using Drizzle ORM
   - Wrap database calls with `withDatabaseErrorHandling` and use `executeOperation` or `executeTransaction` appropriately (use `isWrite = true` for transactions that modify data)
   - Handle potential database errors (like unique constraints) within the repository if specific logic is needed
   - Export an instance: `export const <entity>Repository = new <Entity>Repository()`

### Phase 3: Business Logic

5. **[ ] Create Service**
   - Create `backend/src/services/<entity>.service.ts`
   - Implement the `I<Entity>Service` interface
   - Import and use the `<entity>Repository`
   - Inject necessary dependencies (like `DatabaseConnection`) via the constructor
   - Implement the core business logic for each interface method
   - Perform any necessary data transformations or interactions with other services
   - Use `select<Entity>Schema.parse()` to validate/shape data before returning it
   - Throw custom errors (e.g., `<Entity>ServiceError`, `NotFoundError`) when appropriate

### Phase 4: API Layer

6. **[ ] Create Controller**
   - Create `backend/src/controllers/<entity>.controller.ts`
   - Create a new Hono instance: `const <entity>Controller = new Hono<Env>()`
   - Define routes (e.g., `GET /`, `POST /`, `GET /:id`, `PUT /:id`, `DELETE /:id`)
   - Use `zValidator` middleware with the appropriate Zod schemas (`insert<Entity>Schema`, `update<Entity>Schema`) to validate request inputs (json, params, query)
   - Access authentication details (`c.get('jwtPayload')`) if routes require authentication
   - Instantiate the `<Entity>Service`, passing the database connection (`c.var.db`)
   - Call service methods
   - Implement try/catch blocks to handle errors thrown by the service. Map specific errors to appropriate HTTP status codes and JSON error responses. Return a generic 500 error for unexpected issues
   - Format successful responses using `c.json(...)`
   - Export the controller: `export { <entity>Controller }`

7. **[ ] Mount Controller**
   - In `backend/src/app.ts`, import the new controller
   - Mount it using `app.route('/api/<entities>', <entity>Controller)` (e.g., `/api/feeds`, `/api/submissions`)

### Phase 5: Refinement & Cleanup

8. **[ ] Add Tests**
   - Write unit/integration/component tests for the new repository, service, and controller logic (referencing `backend/test/`)

9. **[ ] Update Error Handling**
   - Ensure any new custom error types are defined in `backend/src/types/errors.ts`
   - Verify the central error handler (`backend/src/utils/error.ts`) handles these errors appropriately if needed, or that controllers handle them specifically

10. **[ ] Code Review & Refactor**
    - Review the new code for adherence to the pattern, consistency, and best practices
    - Refactor as needed

11. **[ ] Delete Unused Code**
    - Remove any old service implementations, route handlers, utility functions, or files that are no longer used after the migration to the new pattern

## Example: Users Service Implementation

### Validation (`backend/src/validation/users.validation.ts`)
```typescript
import { z } from "zod";

export const insertUserSchema = z.object({
  username: z.string().min(2).max(32).regex(/^[a-z0-9]+$/),
  near_public_key: z.string(),
  email: z.string().email().optional().nullable(),
});

export const updateUserSchema = z.object({
  username: z.string().min(2).max(32).regex(/^[a-z0-9]+$/).optional(),
  email: z.string().email().optional().nullable(),
  name: z.string().optional().nullable(),
});

export const selectUserSchema = z.object({
  id: z.number(),
  auth_provider_id: z.string(),
  near_account_id: z.string().nullable(),
  near_public_key: z.string().nullable(),
  username: z.string().nullable(),
  email: z.string().nullable(),
  name: z.string().nullable(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()).nullable(),
});
```

### Service Interface (`backend/src/services/interfaces/user.interface.ts`)
```typescript
import { z } from "zod";
import { insertUserSchema, updateUserSchema } from "../../validation/users.validation";

export type InsertUserData = z.infer<typeof insertUserSchema> & {
  auth_provider_id: string;
};

export type UpdateUserData = z.infer<typeof updateUserSchema>;

export interface IUserService {
  findUserByAuthProviderId(auth_provider_id: string): Promise<any | null>;
  createUser(data: InsertUserData): Promise<any>;
  updateUser(auth_provider_id: string, data: UpdateUserData): Promise<any | null>;
}
```

### Repository (`backend/src/services/db/repositories/user.repository.ts`)
```typescript
import { eq } from "drizzle-orm";
import { DatabaseError, NotFoundError } from "../../../types/errors";
import * as schema from "../schema";
import {
  executeOperation,
  executeTransaction,
  withDatabaseErrorHandling,
} from "../transaction";

export class UserRepository {
  async findByAuthProviderId(auth_provider_id: string) {
    return withDatabaseErrorHandling(
      async () => {
        return executeOperation(async (db) => {
          const result = await db
            .select()
            .from(schema.users)
            .where(eq(schema.users.auth_provider_id, auth_provider_id))
            .limit(1);

          return result.length > 0 ? result[0] : null;
        });
      },
      {
        operationName: "find user by auth_provider_id",
        additionalContext: { auth_provider_id },
      },
      null
    );
  }

  // Other repository methods...
}

export const userRepository = new UserRepository();
```

### Service (`backend/src/services/users.service.ts`)
```typescript
import { selectUserSchema } from "../validation/users.validation";
import { DatabaseConnection } from "./db/connection";
import { userRepository } from "./db/repositories";
import { IUserService, InsertUserData, UpdateUserData } from "./interfaces/user.interface";
import { UserServiceError } from "../types/errors";

export class UserService implements IUserService {
  private userRepository = userRepository;

  constructor(private dbInstance: DatabaseConnection) {}

  async findUserByAuthProviderId(auth_provider_id: string) {
    const user = await this.userRepository.findByAuthProviderId(auth_provider_id);
    
    if (!user) {
      return null;
    }
    
    return selectUserSchema.parse(user);
  }

  // Other service methods...
}
```

### Controller (`backend/src/controllers/users.controller.ts`)
```typescript
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { Env } from "../types/app";
import { InsertUserData, UserService } from "../services/users.service";
import {
  insertUserSchema,
  updateUserSchema,
} from "../validation/users.validation";
import { UserServiceError } from "../types/errors";

const usersController = new Hono<Env>();

usersController.get("/me", async (c) => {
  const jwtPayload = c.get("jwtPayload");
  const authProviderId = jwtPayload?.authProviderId;

  if (!authProviderId) {
    return c.json(
      { error: "Unauthorized: Missing or invalid authentication token" },
      401,
    );
  }

  try {
    const userService = new UserService(c.var.db);
    const user = await userService.findUserByAuthProviderId(authProviderId);

    if (!user) {
      return c.json({ error: "User profile not found" }, 404);
    }

    return c.json({ profile: user });
  } catch (error) {
    console.error("Error in usersController.get('/me'):", error);
    return c.json({ error: "Failed to fetch user profile" }, 500);
  }
}

// Other controller routes...

export { usersController };
```

### App Setup (`backend/src/app.ts`)
```typescript
import { Hono } from "hono";
import { apiRoutes } from "./routes/api";
import { usersController } from "./controllers/users.controller";
import { web3AuthJwtMiddleware } from "./utils/auth";
import { Env } from "./types/app";

export async function createApp(): Promise<AppInstance> {
  const app = new Hono<Env>();

  // Middleware setup...
  app.use("*", web3AuthJwtMiddleware);

  // Mount routes
  app.route("/api", apiRoutes);
  app.route("/api/users", usersController);

  return { app, context };
}
```

## Services to Migrate

1. **[ ] Feeds Service**
   - Current implementation: `backend/src/services/feeds/`
   - API routes: `/api/feeds`

2. **[ ] Submissions Service**
   - Current implementation: `backend/src/services/submissions/`
   - API routes: `/api/submissions`

3. **[ ] Processor Service**
   - Current implementation: `backend/src/services/processor/`
   - API routes: `/api/process`

4. **[ ] Distribution Service**
   - Current implementation: `backend/src/services/distribution/`
   - API routes: `/api/distribute`

5. **[ ] Transformation Service**
   - Current implementation: `backend/src/services/transformation/`
   - API routes: `/api/transform`

6. **[ ] Plugin Service**
   - Current implementation: `backend/src/services/plugins/`
   - API routes: `/api/plugins`

7. **[ ] Config Service**
   - Current implementation: `backend/src/services/config/`
   - API routes: `/api/config`

8. **[ ] Twitter Service**
   - Current implementation: `backend/src/services/twitter/`
   - API routes: `/api/twitter`

## Progress Tracking

| Service | Validation | Interface | Repository | Service | Controller | Mounted | Tests | Cleanup |
|---------|------------|-----------|------------|---------|------------|---------|-------|---------|
| Users   | ✅         | ✅        | ✅         | ✅      | ✅         | ✅      | ✅    | ✅      |
| Feeds   | ❌         | ❌        | ❌         | ❌      | ❌         | ❌      | ❌    | ❌      |
| Submissions | ❌     | ❌        | ❌         | ❌      | ❌         | ❌      | ❌    | ❌      |
| Processor | ❌       | ❌        | ❌         | ❌      | ❌         | ❌      | ❌    | ❌      |
| Distribution | ❌    | ❌        | ❌         | ❌      | ❌         | ❌      | ❌    | ❌      |
| Transformation | ❌  | ❌        | ❌         | ❌      | ❌         | ❌      | ❌    | ❌      |
| Plugin   | ❌        | ❌        | ❌         | ❌      | ❌         | ❌      | ❌    | ❌      |
| Config   | ❌        | ❌        | ❌         | ❌      | ❌         | ❌      | ❌    | ❌      |
| Twitter  | ❌        | ❌        | ❌         | ❌      | ❌         | ❌      | ❌    | ❌      |
