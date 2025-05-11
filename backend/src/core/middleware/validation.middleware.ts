import { Context, MiddlewareHandler, Next } from 'hono';
import { z } from 'zod';
import { ValidationError } from '../errors';

/**
 * Options for the validation middleware
 */
export interface ValidationOptions {
  /**
   * Whether to throw an error on validation failure (default: true)
   * If false, the validation errors will be stored in c.set('validationErrors')
   */
  throwOnError?: boolean;
  
  /**
   * Custom error message for validation failures
   */
  errorMessage?: string;
}

/**
 * Validation result interface
 */
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: z.ZodError;
}

/**
 * Middleware for validating request data using Zod schemas
 * @param target The request target to validate ('query', 'params', 'body', or 'headers')
 * @param schema The Zod schema to validate against
 * @param options Validation options
 * @returns A middleware handler
 */
export function validateRequest<T extends z.ZodTypeAny>(
  target: 'query' | 'params' | 'body' | 'headers',
  schema: T,
  options: ValidationOptions = {}
): MiddlewareHandler {
  const { throwOnError = true, errorMessage } = options;
  
  return async (c: Context, next: Next) => {
    let data: unknown;
    
    // Extract data based on target
    switch (target) {
      case 'query':
        data = c.req.query();
        break;
      case 'params':
        data = c.req.param();
        break;
      case 'body':
        try {
          data = await c.req.json();
        } catch (error) {
          if (throwOnError) {
            throw new ValidationError('Invalid JSON body');
          }
          c.set('validationErrors', { message: 'Invalid JSON body' });
          return next();
        }
        break;
      case 'headers':
        data = Object.fromEntries(
          Array.from(c.req.raw.headers.entries())
        );
        break;
    }
    
    // Validate data against schema
    const result = schema.safeParse(data);
    
    if (result.success) {
      // Store validated data
      c.set(`valid:${target}`, result.data);
      
      // For backward compatibility with @hono/zod-validator
      if (!c.req.valid) {
        c.req.valid = (t: string) => {
          return c.get(`valid:${t}`);
        };
      }
      
      return next();
    } else {
      // Handle validation errors
      if (throwOnError) {
        const message = errorMessage || `Validation failed for ${target}`;
        const context = {
          target,
          errors: result.error.format(),
        };
        throw new ValidationError(message, context);
      }
      
      // Store validation errors
      c.set('validationErrors', {
        target,
        errors: result.error.format(),
      });
      
      return next();
    }
  };
}

/**
 * Middleware for validating multiple request targets using Zod schemas
 * @param schemas An object mapping targets to Zod schemas
 * @param options Validation options
 * @returns A middleware handler
 */
export function validateRequestSchema(
  schemas: {
    query?: z.ZodTypeAny;
    params?: z.ZodTypeAny;
    body?: z.ZodTypeAny;
    headers?: z.ZodTypeAny;
  },
  options: ValidationOptions = {}
): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    const middlewares: MiddlewareHandler[] = [];
    
    // Create middleware for each schema
    for (const [target, schema] of Object.entries(schemas)) {
      if (schema && ['query', 'params', 'body', 'headers'].includes(target)) {
        middlewares.push(
          validateRequest(
            target as 'query' | 'params' | 'body' | 'headers',
            schema,
            options
          )
        );
      }
    }
    
    // Execute middlewares in sequence
    for (const middleware of middlewares) {
      await middleware(c, async () => {});
      
      // Check for validation errors
      if (c.get('validationErrors') && !options.throwOnError) {
        return next();
      }
    }
    
    return next();
  };
}

/**
 * Helper function to get validated data from a Hono context
 * @param c The Hono context
 * @param target The request target ('query', 'params', 'body', or 'headers')
 * @returns The validated data
 */
export function getValidatedData<T>(
  c: Context,
  target: 'query' | 'params' | 'body' | 'headers'
): T {
  return c.get(`valid:${target}`) as T;
}
