import { SQL, and, eq, sql } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';
import { DatabaseError, NotFoundError } from '../errors';
import { PaginatedResponse, PaginationQuery } from '../types';

/**
 * Base repository interface that defines common CRUD operations
 */
export interface IBaseRepository<T, CreateT, UpdateT> {
  /**
   * Find all entities
   * @param options Query options
   * @returns Array of entities
   */
  findAll(options?: QueryOptions<T>): Promise<T[]>;

  /**
   * Find entities with pagination
   * @param pagination Pagination options
   * @param options Query options
   * @returns Paginated response
   */
  findPaginated(pagination: PaginationQuery, options?: QueryOptions<T>): Promise<PaginatedResponse<T>>;

  /**
   * Find an entity by ID
   * @param id Entity ID
   * @returns Entity or null if not found
   */
  findById(id: string | number): Promise<T | null>;

  /**
   * Find an entity by ID or throw an error if not found
   * @param id Entity ID
   * @param resourceName Resource name for error message
   * @returns Entity
   * @throws NotFoundError if entity not found
   */
  findByIdOrThrow(id: string | number, resourceName?: string): Promise<T>;

  /**
   * Find entities by a specific field value
   * @param field Field name
   * @param value Field value
   * @returns Array of entities
   */
  findByField<K extends keyof T>(field: K, value: T[K]): Promise<T[]>;

  /**
   * Create a new entity
   * @param data Entity data
   * @returns Created entity
   */
  create(data: CreateT): Promise<T>;

  /**
   * Create multiple entities
   * @param data Array of entity data
   * @returns Array of created entities
   */
  createMany(data: CreateT[]): Promise<T[]>;

  /**
   * Update an entity
   * @param id Entity ID
   * @param data Entity data
   * @returns Updated entity
   */
  update(id: string | number, data: UpdateT): Promise<T>;

  /**
   * Delete an entity
   * @param id Entity ID
   * @returns Deleted entity
   */
  delete(id: string | number): Promise<T>;

  /**
   * Execute a custom query
   * @param queryFn Function that returns a query
   * @returns Query result
   */
  executeQuery<R>(queryFn: (table: any) => any): Promise<R[]>;

  /**
   * Execute a raw SQL query
   * @param query SQL query
   * @param params Query parameters
   * @returns Query result
   */
  executeRawQuery<R>(query: SQL, params?: any[]): Promise<R[]>;

  /**
   * Begin a transaction
   * @returns Transaction object
   */
  beginTransaction(): Promise<any>;

  /**
   * Commit a transaction
   * @param transaction Transaction object
   */
  commitTransaction(transaction: any): Promise<void>;

  /**
   * Rollback a transaction
   * @param transaction Transaction object
   */
  rollbackTransaction(transaction: any): Promise<void>;
}

/**
 * Query options for repository methods
 */
export interface QueryOptions<T> {
  /**
   * Where conditions
   */
  where?: Partial<T> | any;

  /**
   * Order by field and direction
   */
  orderBy?: {
    field: keyof T;
    direction: 'asc' | 'desc';
  };

  /**
   * Relations to include
   */
  include?: string[];

  /**
   * Fields to select
   */
  select?: (keyof T)[];

  /**
   * Limit the number of results
   */
  limit?: number;

  /**
   * Offset the results
   */
  offset?: number;
}

/**
 * Base repository implementation using Drizzle ORM
 */
export abstract class BaseRepository<T, CreateT, UpdateT> implements IBaseRepository<T, CreateT, UpdateT> {
  /**
   * Constructor
   * @param db Database connection
   * @param table Database table
   * @param idField ID field name
   */
  constructor(
    protected readonly db: any,
    protected readonly table: any,
    protected readonly idField: keyof T = 'id' as keyof T
  ) {}

  /**
   * Find all entities
   * @param options Query options
   * @returns Array of entities
   */
  async findAll(options?: QueryOptions<T>): Promise<T[]> {
    try {
      let query = this.db.select().from(this.table);

      if (options?.where) {
        if (typeof options.where === 'object' && !('sql' in options.where)) {
          // Convert object to conditions
          const conditions = Object.entries(options.where).map(([key, value]) => {
            return eq(this.table[key], value);
          });
          
          if (conditions.length > 0) {
            query = query.where(and(...conditions));
          }
        } else {
          query = query.where(options.where);
        }
      }

      if (options?.orderBy) {
        const { field, direction } = options.orderBy;
        const fieldName = String(field);
        query = query.orderBy(
          direction === 'asc' 
            ? this.table[fieldName].asc() 
            : this.table[fieldName].desc()
        );
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.offset(options.offset);
      }

      return await query;
    } catch (error) {
      throw new DatabaseError(`Failed to find entities: ${(error as Error).message}`);
    }
  }

  /**
   * Find entities with pagination
   * @param pagination Pagination options
   * @param options Query options
   * @returns Paginated response
   */
  async findPaginated(
    pagination: PaginationQuery,
    options?: QueryOptions<T>
  ): Promise<PaginatedResponse<T>> {
    try {
      const { page = 1, pageSize = 10 } = pagination;
      const offset = (page - 1) * pageSize;

      // Get total count
      const countQuery = this.db
        .select({ count: sql`count(*)` })
        .from(this.table);

      if (options?.where) {
        if (typeof options.where === 'object' && !('sql' in options.where)) {
          // Convert object to conditions
          const conditions = Object.entries(options.where).map(([key, value]) => {
            return eq(this.table[key], value);
          });
          
          if (conditions.length > 0) {
            countQuery.where(and(...conditions));
          }
        } else {
          countQuery.where(options.where);
        }
      }

      const [{ count }] = await countQuery;
      const total = Number(count);

      // Get paginated results
      const items = await this.findAll({
        ...options,
        limit: pageSize,
        offset,
      });

      return {
        items,
        total,
        page,
        pageSize,
      };
    } catch (error) {
      throw new DatabaseError(`Failed to find paginated entities: ${(error as Error).message}`);
    }
  }

  /**
   * Find an entity by ID
   * @param id Entity ID
   * @returns Entity or null if not found
   */
  async findById(id: string | number): Promise<T | null> {
    try {
      const idFieldName = String(this.idField);
      const result = await this.db
        .select()
        .from(this.table)
        .where(eq(this.table[idFieldName], id))
        .limit(1);

      return result.length > 0 ? result[0] : null;
    } catch (error) {
      throw new DatabaseError(`Failed to find entity by ID: ${(error as Error).message}`);
    }
  }

  /**
   * Find an entity by ID or throw an error if not found
   * @param id Entity ID
   * @param resourceName Resource name for error message
   * @returns Entity
   * @throws NotFoundError if entity not found
   */
  async findByIdOrThrow(id: string | number, resourceName?: string): Promise<T> {
    const entity = await this.findById(id);
    
    if (!entity) {
      const resource = resourceName || this.getResourceName();
      throw new NotFoundError(resource, id.toString());
    }
    
    return entity;
  }

  /**
   * Find entities by a specific field value
   * @param field Field name
   * @param value Field value
   * @returns Array of entities
   */
  async findByField<K extends keyof T>(field: K, value: T[K]): Promise<T[]> {
    try {
      const fieldName = String(field);
      return await this.db
        .select()
        .from(this.table)
        .where(eq(this.table[fieldName], value));
    } catch (error) {
      throw new DatabaseError(`Failed to find entities by field: ${(error as Error).message}`);
    }
  }

  /**
   * Create a new entity
   * @param data Entity data
   * @returns Created entity
   */
  async create(data: CreateT): Promise<T> {
    try {
      const result = await this.db
        .insert(this.table)
        .values(data as any)
        .returning();

      return result[0];
    } catch (error) {
      throw new DatabaseError(`Failed to create entity: ${(error as Error).message}`);
    }
  }

  /**
   * Create multiple entities
   * @param data Array of entity data
   * @returns Array of created entities
   */
  async createMany(data: CreateT[]): Promise<T[]> {
    try {
      if (data.length === 0) {
        return [];
      }
      
      return await this.db
        .insert(this.table)
        .values(data as any)
        .returning();
    } catch (error) {
      throw new DatabaseError(`Failed to create entities: ${(error as Error).message}`);
    }
  }

  /**
   * Update an entity
   * @param id Entity ID
   * @param data Entity data
   * @returns Updated entity
   */
  async update(id: string | number, data: UpdateT): Promise<T> {
    try {
      const idFieldName = String(this.idField);
      const result = await this.db
        .update(this.table)
        .set(data as any)
        .where(eq(this.table[idFieldName], id))
        .returning();

      if (result.length === 0) {
        const resource = this.getResourceName();
        throw new NotFoundError(resource, id.toString());
      }

      return result[0];
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError(`Failed to update entity: ${(error as Error).message}`);
    }
  }

  /**
   * Delete an entity
   * @param id Entity ID
   * @returns Deleted entity
   */
  async delete(id: string | number): Promise<T> {
    try {
      const idFieldName = String(this.idField);
      const result = await this.db
        .delete(this.table)
        .where(eq(this.table[idFieldName], id))
        .returning();

      if (result.length === 0) {
        const resource = this.getResourceName();
        throw new NotFoundError(resource, id.toString());
      }

      return result[0];
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError(`Failed to delete entity: ${(error as Error).message}`);
    }
  }

  /**
   * Execute a custom query
   * @param queryFn Function that returns a query
   * @returns Query result
   */
  async executeQuery<R>(queryFn: (table: any) => any): Promise<R[]> {
    try {
      const query = queryFn(this.table);
      return await this.db.execute(query);
    } catch (error) {
      throw new DatabaseError(`Failed to execute query: ${(error as Error).message}`);
    }
  }

  /**
   * Execute a raw SQL query
   * @param query SQL query
   * @param params Query parameters
   * @returns Query result
   */
  async executeRawQuery<R>(query: SQL, params?: any[]): Promise<R[]> {
    try {
      return await this.db.execute(query, params);
    } catch (error) {
      throw new DatabaseError(`Failed to execute raw query: ${(error as Error).message}`);
    }
  }

  /**
   * Begin a transaction
   * @returns Transaction object
   */
  async beginTransaction(): Promise<any> {
    try {
      return await this.db.transaction();
    } catch (error) {
      throw new DatabaseError(`Failed to begin transaction: ${(error as Error).message}`);
    }
  }

  /**
   * Commit a transaction
   * @param transaction Transaction object
   */
  async commitTransaction(transaction: any): Promise<void> {
    try {
      await transaction.commit();
    } catch (error) {
      throw new DatabaseError(`Failed to commit transaction: ${(error as Error).message}`);
    }
  }

  /**
   * Rollback a transaction
   * @param transaction Transaction object
   */
  async rollbackTransaction(transaction: any): Promise<void> {
    try {
      await transaction.rollback();
    } catch (error) {
      throw new DatabaseError(`Failed to rollback transaction: ${(error as Error).message}`);
    }
  }

  /**
   * Get the resource name for error messages
   * @returns Resource name
   */
  protected getResourceName(): string {
    return this.constructor.name.replace('Repository', '');
  }
}
