# Security & Role-Based Access Control (RBAC) Recommendations

This document outlines recommendations for implementing Role-Based Access Control (RBAC) in the `curatedotfun` backend. This is crucial for securing administrative functions, especially the management of configurations once they are migrated to the database.

## 1. Goal

*   Define a flexible system for managing user roles and permissions.
*   Control access to sensitive operations, particularly CRUD operations on global configurations, plugin registrations, and feed configurations.
*   Ensure that only authorized users can perform administrative tasks.
*   Integrate RBAC checks into the API layer and service layer where appropriate.

## 2. Database Schema Design for RBAC

New tables will be required to manage roles, permissions, and their assignments to users.

### 2.1. `roles` Table

Stores the definitions of available roles in the system.

```sql
-- Example Drizzle Schema for roles
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL, -- e.g., 'super_admin', 'feed_admin', 'feed_moderator', 'plugin_manager'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Drizzle Schema (`roles.schema.ts`):**
```typescript
// backend/src/services/db/schema/roles.ts
import { serial, text, timestamp, pgTable } from "drizzle-orm/pg-core";

export const rolesTable = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").unique().notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Role = typeof rolesTable.$inferSelect;
export type NewRole = typeof rolesTable.$inferInsert;
```

### 2.2. `permissions` Table

Stores the definitions of available permissions. Permissions should be granular.

```sql
-- Example Drizzle Schema for permissions
CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL, -- e.g., 'manage_global_settings', 'manage_plugin_registrations', 'manage_feed_config_all', 'manage_feed_config_own', 'moderate_feed_all', 'moderate_feed_own'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```
**Note**: For resource-specific permissions like `manage_feed_config_[feedId]`, the `name` could be generic (e.g., `manage_feed_config`) and the resource instance check would happen in code, or you could have more specific permission strings if the number of resources is manageable. A common pattern is `resource:action` (e.g., `feed_config:edit`, `global_settings:edit`).

**Drizzle Schema (`permissions.schema.ts`):**
```typescript
// backend/src/services/db/schema/permissions.ts
import { serial, text, timestamp, pgTable } from "drizzle-orm/pg-core";

export const permissionsTable = pgTable("permissions", {
  id: serial("id").primaryKey(),
  name: text("name").unique().notNull(), // e.g., 'global_settings:read', 'global_settings:update', 'feed:create', 'feed_config:update'
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Permission = typeof permissionsTable.$inferSelect;
export type NewPermission = typeof permissionsTable.$inferInsert;
```

### 2.3. `role_permissions` Table (Many-to-Many)

Links roles to permissions.

```sql
-- Example Drizzle Schema for role_permissions
CREATE TABLE role_permissions (
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
```

**Drizzle Schema (`role_permissions.schema.ts`):**
```typescript
// backend/src/services/db/schema/role_permissions.ts
import { integer, primaryKey, timestamp, pgTable } from "drizzle-orm/pg-core";
import { rolesTable } from "./roles.schema";
import { permissionsTable } from "./permissions.schema";

export const rolePermissionsTable = pgTable("role_permissions", {
  roleId: integer("role_id").notNull().references(() => rolesTable.id, { onDelete: "cascade" }),
  permissionId: integer("permission_id").notNull().references(() => permissionsTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.roleId, table.permissionId] }),
}));

export type RolePermission = typeof rolePermissionsTable.$inferSelect;
export type NewRolePermission = typeof rolePermissionsTable.$inferInsert;
```

### 2.4. `user_roles` Table (Many-to-Many)

Assigns roles to users. Could also include context (e.g., a role specific to a feed).

```sql
-- Example Drizzle Schema for user_roles
CREATE TABLE user_roles (
    user_db_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Assuming users.id is the integer PK from your existing users table
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    resource_id TEXT, -- Optional: For context-specific roles, e.g., a feed_id if role is 'feed_admin' for a specific feed
    PRIMARY KEY (user_db_id, role_id, resource_id), -- resource_id can be NULL, composite PK needs care
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
-- If resource_id can be NULL, the PK might need adjustment or a unique constraint.
-- A common approach is to have user_id, role_id as PK and handle resource_id in application logic or separate table for resource-specific roles.
-- For simplicity, let's assume resource_id is part of the key for now, implying roles are always global or tied to a specific resource ID.
-- A more flexible model might be:
-- user_id, role_id (PK)
-- And another table for user_feed_roles (user_id, feed_id, role_id)
```

**Drizzle Schema (`user_roles.schema.ts`):**
```typescript
// backend/src/services/db/schema/user_roles.ts
import { integer, primaryKey, text, timestamp, pgTable } from "drizzle-orm/pg-core";
import { users } from "../schema"; // Existing users table
import { rolesTable } from "./roles.schema";

export const userRolesTable = pgTable("user_roles", {
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  roleId: integer("role_id").notNull().references(() => rolesTable.id, { onDelete: "cascade" }),
  resourceId: text("resource_id"), // e.g., a specific feed_id for 'feed_admin' role
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  // This PK allows a user to have the same role for different resources, or a global role (resourceId IS NULL)
  // Adjust based on exact needs. A unique constraint might be better if resourceId is nullable.
  pk: primaryKey({ columns: [table.userId, table.roleId, table.resourceId] }), 
}));

export type UserRole = typeof userRolesTable.$inferSelect;
export type NewUserRole = typeof userRolesTable.$inferInsert;
```
**Note**: Add these new schema files to `backend/src/services/db/schema.ts` exports and generate migrations.

## 3. RBAC Service (`RbacService`)

A new service to handle RBAC logic.

### 3.1. Responsibilities:

*   Checking if a user has a specific permission: `hasPermission(userId: number, permissionName: string, resourceId?: string): Promise<boolean>`
*   Getting all permissions for a user: `getUserPermissions(userId: number): Promise<Set<string>>` (might return a map if resource context is important).
*   Managing role and permission assignments (CRUD operations for roles, permissions, role_permissions, user_roles - likely for admin interfaces).

### 3.2. `RbacService` Structure (Conceptual):

```typescript
// backend/src/services/rbac.service.ts
import { DB } from "./db/types";
import { UserRepository } from "./db/repositories/user.repository"; // Or direct DB access
import { RolesRepository } from "./db/repositories/roles.repository"; // New
import { PermissionsRepository } from "./db/repositories/permissions.repository"; // New
import { UserRolesRepository } from "./db/repositories/userRoles.repository"; // New
import { RolePermissionsRepository } from "./db/repositories/rolePermissions.repository"; // New
import { logger } from "../utils/logger";

export class RbacService {
  // Cache for user permissions to reduce DB lookups per request
  private userPermissionsCache = new Map<number, { permissions: Set<string>, timestamp: number }>();
  private cacheTTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    private db: DB, // Or specific repositories
    private userRolesRepo: UserRolesRepository,
    private rolePermsRepo: RolePermissionsRepository,
    // Potentially other repos if needed
  ) {}

  public async getUserPermissions(userId: number, forceRefresh: boolean = false): Promise<Set<string>> {
    const cached = this.userPermissionsCache.get(userId);
    if (!forceRefresh && cached && (Date.now() - cached.timestamp < this.cacheTTL)) {
      return cached.permissions;
    }

    const userRoles = await this.userRolesRepo.findRolesByUserId(userId);
    if (!userRoles.length) {
      return new Set();
    }

    const roleIds = userRoles.map(ur => ur.roleId);
    // This needs to fetch permissions based on roleIds and potentially resourceIds if permissions are resource-specific.
    // For simplicity here, assume global permissions per role for now.
    // A more complex query would join user_roles with role_permissions.
    const permissions = await this.rolePermsRepo.findPermissionsByRoleIds(roleIds);
    
    const permissionNames = new Set(permissions.map(p => p.name)); // Assuming permission object has a 'name' field

    this.userPermissionsCache.set(userId, { permissions: permissionNames, timestamp: Date.now() });
    return permissionNames;
  }

  public async hasPermission(userId: number, permissionName: string, resourceId?: string): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId);
    
    // Basic check:
    if (userPermissions.has(permissionName)) return true;

    // Resource-specific check (example for 'feed_config:edit')
    // This part needs careful design based on how resource-specific permissions are structured.
    // If permissionName is 'feed_config:edit' and resourceId is a feed_id:
    // 1. Check if user has 'feed_config:edit_all'.
    // 2. Check if user has 'feed_config:edit_own' AND is owner/admin of 'resourceId'.
    //    This requires fetching user's roles for that specific resourceId.
    // For now, this is a simplified check.
    // A common pattern is to have permissions like 'feed_config:edit:*' (all) or check specific user_role entries with matching resourceId.

    // Example: if permission is 'manage_feed_config' and resourceId is provided
    if (permissionName.includes(':') && resourceId) { // e.g. 'feed_config:edit'
        const [resourceType, action] = permissionName.split(':');
        // Check for a general permission like 'feed_config:edit_all_feeds'
        if (userPermissions.has(`${resourceType}:${action}_all`)) return true;

        // Check for specific role on resource:
        // Does user have a role (e.g. 'feed_admin') on this specific resourceId (feed_id)
        // that grants the permission 'feed_config:edit'?
        const userRolesForResource = await this.userRolesRepo.findRolesByUserIdAndResource(userId, resourceId);
        for (const userRole of userRolesForResource) {
            const rolePermissions = await this.rolePermsRepo.findPermissionsByRoleIds([userRole.roleId]);
            if (rolePermissions.some(rp => rp.name === permissionName)) {
                return true;
            }
        }
    }
    
    logger.debug(`User ${userId} permission check for '${permissionName}' (resource: ${resourceId}): FAILED`);
    return false;
  }

  public invalidateUserCache(userId: number): void {
    this.userPermissionsCache.delete(userId);
  }

  // ... methods for managing roles, permissions, assignments (CRUD) ...
  // e.g., assignRoleToUser(userId, roleName, resourceId?), addPermissionToRole(roleName, permissionName)
}
```
**Note**: New repositories (`RolesRepository`, `PermissionsRepository`, etc.) would need to be created.

## 4. Integration with API and Services

### 4.1. Hono Middleware for RBAC:

Create a Hono middleware that uses `RbacService` to check permissions for protected routes.

```typescript
// backend/src/utils/rbac.middleware.ts
import { MiddlewareHandler } from "hono";
import { RbacService } from "../services/rbac.service"; // Assuming RbacService is managed by ServiceProvider
import { ServiceProvider } from "./service-provider";
import { users } from "../services/db/schema"; // To get user ID type if needed

export const rbacMiddleware = (permissionName: string, resourceIdParam?: string): MiddlewareHandler<Env> => {
  return async (c, next) => {
    const jwtPayload = c.get("jwtPayload");
    if (!jwtPayload || !jwtPayload.userId) { // Assuming jwtPayload contains userId (numeric DB ID)
      return c.json({ error: "Unauthorized: User not authenticated." }, 401);
    }
    const userId = jwtPayload.userId as number; // Cast or ensure type

    const rbacService = ServiceProvider.getInstance().getService<RbacService>("rbacService"); // Get RbacService

    let resourceId: string | undefined = undefined;
    if (resourceIdParam) {
      resourceId = c.req.param(resourceIdParam);
    }

    const hasPerm = await rbacService.hasPermission(userId, permissionName, resourceId);
    if (!hasPerm) {
      return c.json({ error: `Forbidden: Missing permission '${permissionName}'` + (resourceId ? ` for resource '${resourceId}'` : '') }, 403);
    }

    await next();
  };
};
```
**Usage in routes:**
```typescript
// backend/src/routes/api/config.ts (Example)
// import { rbacMiddleware } from "../../utils/rbac.middleware";
// configRoutes.put("/global/:settingKey", rbacMiddleware("global_settings:update"), async (c) => { /* ... */ });
// configRoutes.put("/feed/:feedId", rbacMiddleware("feed_config:update", "feedId"), async (c) => { /* ... */ });
```
**Note**: `jwtPayload` needs to reliably contain the user's database `id` (integer PK from `users` table), not just `authProviderId`. This might require adjustment in `web3AuthJwtMiddleware` or user loading logic.

### 4.2. Service-Level Checks:

For operations within services that modify critical data (like `ConfigService` updating a setting), an explicit permission check should also be performed, passing the authenticated user's ID.

## 5. Defining Roles and Permissions

*   **Initial Roles**:
    *   `super_admin`: Can do anything.
    *   `feed_admin`: Can manage specific feeds they are assigned to (edit `FeedConfig`, manage moderators for that feed).
    *   `feed_moderator`: Can moderate submissions for specific feeds they are assigned to.
    *   `plugin_manager`: Can manage plugin registrations.
    *   `config_editor`: Can manage global settings.
*   **Initial Permissions** (examples, use `resource:action` pattern):
    *   `global_settings:read`, `global_settings:update`
    *   `plugin_registrations:create`, `plugin_registrations:read`, `plugin_registrations:update`, `plugin_registrations:delete`
    *   `feed:create`
    *   `feed_config:read_all`, `feed_config:read_own`
    *   `feed_config:update_all`, `feed_config:update_own` (where "own" refers to feeds the user is `feed_admin` for)
    *   `submission:moderate_all`, `submission:moderate_own`
*   **Seeding**: Roles, permissions, and initial `role_permissions` links should be seeded into the database. A super_admin user should also be designated.

## 6. Assigning Roles to Users

*   **Initial Super Admin**: Manually assign or via a seed script.
*   **Feed Admin**: When a user creates a feed (if this functionality is added), they could automatically be assigned the `feed_admin` role for that feed `resource_id`.
*   **API Endpoints**: Admin APIs (protected by `super_admin` or other relevant roles) will be needed to manage user role assignments.

## 7. Transition and Considerations

*   **Phased Rollout**: Implement the core RBAC tables and `RbacService` first. Then, progressively apply the `rbacMiddleware` to API endpoints, starting with the most critical ones (config management).
*   **User ID in JWT**: Ensure the user's internal database ID (from `users.id`) is included in the JWT payload for efficient RBAC checks.
*   **Complexity of `resourceId`**: Handling `resourceId` in `hasPermission` can become complex. The design should clearly define how resource-specific permissions are evaluated. Using a convention like `permission_on_resource_type` (e.g., `edit_feed_config`) and then checking ownership/specific role assignment for the given `resourceId` within the `RbacService` is a common pattern.
*   **Caching**: Implement caching for user permissions within `RbacService` to avoid repeated database queries on every request. Ensure cache invalidation when roles/permissions change.

This RBAC implementation will provide a strong foundation for securing administrative functionalities as the application evolves.
