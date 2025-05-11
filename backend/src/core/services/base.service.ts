import { IBaseRepository } from '../repositories';
import { PaginatedResponse, PaginationQuery } from '../types';

/**
 * Base service interface that defines common operations
 */
export interface IBaseService<T, CreateT, UpdateT> {
  /**
   * Find all entities
   * @param options Query options
   * @returns Array of entities
   */
  findAll(options?: any): Promise<T[]>;

  /**
   * Find entities with pagination
   * @param pagination Pagination options
   * @param options Query options
   * @returns Paginated response
   */
  findPaginated(pagination: PaginationQuery, options?: any): Promise<PaginatedResponse<T>>;

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
   */
  findByIdOrThrow(id: string | number, resourceName?: string): Promise<T>;

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
}

/**
 * Base service implementation that uses a repository for data access
 */
export abstract class BaseService<T, CreateT, UpdateT> implements IBaseService<T, CreateT, UpdateT> {
  /**
   * Constructor
   * @param repository Repository for data access
   */
  constructor(protected readonly repository: IBaseRepository<T, CreateT, UpdateT>) {}

  /**
   * Find all entities
   * @param options Query options
   * @returns Array of entities
   */
  async findAll(options?: any): Promise<T[]> {
    return this.repository.findAll(options);
  }

  /**
   * Find entities with pagination
   * @param pagination Pagination options
   * @param options Query options
   * @returns Paginated response
   */
  async findPaginated(pagination: PaginationQuery, options?: any): Promise<PaginatedResponse<T>> {
    return this.repository.findPaginated(pagination, options);
  }

  /**
   * Find an entity by ID
   * @param id Entity ID
   * @returns Entity or null if not found
   */
  async findById(id: string | number): Promise<T | null> {
    return this.repository.findById(id);
  }

  /**
   * Find an entity by ID or throw an error if not found
   * @param id Entity ID
   * @param resourceName Resource name for error message
   * @returns Entity
   */
  async findByIdOrThrow(id: string | number, resourceName?: string): Promise<T> {
    return this.repository.findByIdOrThrow(id, resourceName);
  }

  /**
   * Create a new entity
   * @param data Entity data
   * @returns Created entity
   */
  async create(data: CreateT): Promise<T> {
    return this.repository.create(data);
  }

  /**
   * Create multiple entities
   * @param data Array of entity data
   * @returns Array of created entities
   */
  async createMany(data: CreateT[]): Promise<T[]> {
    return this.repository.createMany(data);
  }

  /**
   * Update an entity
   * @param id Entity ID
   * @param data Entity data
   * @returns Updated entity
   */
  async update(id: string | number, data: UpdateT): Promise<T> {
    return this.repository.update(id, data);
  }

  /**
   * Delete an entity
   * @param id Entity ID
   * @returns Deleted entity
   */
  async delete(id: string | number): Promise<T> {
    return this.repository.delete(id);
  }

  /**
   * Perform business logic before creating an entity
   * @param data Entity data
   * @returns Processed entity data
   */
  protected async beforeCreate(data: CreateT): Promise<CreateT> {
    return data;
  }

  /**
   * Perform business logic after creating an entity
   * @param entity Created entity
   * @returns Processed entity
   */
  protected async afterCreate(entity: T): Promise<T> {
    return entity;
  }

  /**
   * Perform business logic before updating an entity
   * @param id Entity ID
   * @param data Entity data
   * @returns Processed entity data
   */
  protected async beforeUpdate(id: string | number, data: UpdateT): Promise<UpdateT> {
    return data;
  }

  /**
   * Perform business logic after updating an entity
   * @param entity Updated entity
   * @returns Processed entity
   */
  protected async afterUpdate(entity: T): Promise<T> {
    return entity;
  }

  /**
   * Perform business logic before deleting an entity
   * @param id Entity ID
   */
  protected async beforeDelete(id: string | number): Promise<void> {
    // No-op by default
  }

  /**
   * Perform business logic after deleting an entity
   * @param entity Deleted entity
   * @returns Processed entity
   */
  protected async afterDelete(entity: T): Promise<T> {
    return entity;
  }
}
