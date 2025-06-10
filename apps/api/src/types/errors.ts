/**
 * Base application error class
 * All application errors should extend this class
 */
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public cause?: Error,
  ) {
    super(message);
    this.name = this.constructor.name;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Serializes the error for API responses
   */
  toJSON() {
    return {
      error: this.name,
      message: this.message,
      statusCode: this.statusCode,
    };
  }
}

/**
 * Authentication related errors
 */
export class AuthError extends AppError {
  constructor(message: string, statusCode: number = 401, cause?: Error) {
    super(message, statusCode, cause);
  }
}

/**
 * Validation related errors
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    public details?: Record<string, string[]>,
    cause?: Error,
  ) {
    super(message, 400, cause);
  }

  toJSON() {
    return {
      ...super.toJSON(),
      details: this.details,
    };
  }
}

/**
 * Service layer errors
 */
export class ServiceError extends AppError {
  constructor(message: string, statusCode: number = 500, cause?: Error) {
    super(message, statusCode, cause);
  }
}

/**
 * Database related errors
 */
export class DatabaseError extends AppError {
  constructor(
    message: string,
    public code?: string,
    cause?: Error,
  ) {
    super(message, 500, cause);
  }

  toJSON() {
    return {
      ...super.toJSON(),
      code: this.code,
    };
  }
}

/**
 * Not found errors
 */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string | number) {
    const message = identifier
      ? `${resource} with identifier ${identifier} not found`
      : `${resource} not found`;
    super(message, 404);
  }
}

/**
 * Conflict errors (e.g., duplicate resources)
 */
export class ConflictError extends AppError {
  constructor(message: string, cause?: Error) {
    super(message, 409, cause);
  }
}

/**
 * User service specific errors
 */
export class UserServiceError extends ServiceError {
  constructor(message: string, statusCode: number = 500, cause?: Error) {
    super(message, statusCode, cause);
  }
}

/**
 * Activity service specific errors
 */
export class ActivityServiceError extends ServiceError {
  constructor(
    message: string,
    options?: { statusCode?: number; cause?: Error },
  ) {
    super(message, options?.statusCode || 500, options?.cause);
  }
}

/**
 * NEAR account related errors
 */
export class NearAccountError extends ServiceError {
  constructor(message: string, statusCode: number = 400, cause?: Error) {
    super(message, statusCode, cause);
  }
}

export class PluginError extends AppError {
  constructor(
    message: string,
    public cause?: Error,
  ) {
    super(message, 500, cause);
    this.name = "PluginError";
  }
}

export class PluginLoadError extends PluginError {
  constructor(name: string, url: string, cause?: Error) {
    super(`Failed to load plugin ${name} from ${url}`, cause);
    this.name = "PluginLoadError";
  }
}

export class PluginInitError extends PluginError {
  constructor(name: string, cause?: Error) {
    super(`Failed to initialize plugin ${name}`, cause);
    this.name = "PluginInitError";
  }
}

export class PluginExecutionError extends PluginError {
  constructor(name: string, operation: string, cause?: Error) {
    super(`Plugin ${name} failed during ${operation}`, cause);
    this.name = "PluginExecutionError";
  }
}

export type TransformStage = "global" | "distributor" | "batch";

export class TransformError extends AppError {
  constructor(
    public readonly plugin: string,
    public readonly stage: TransformStage,
    public readonly index: number,
    message: string,
    public readonly cause?: Error,
  ) {
    super(
      `Transform error in ${stage} transform #${index + 1} (${plugin}): ${message}`,
      500,
      cause,
    );
    this.name = "TransformError";
  }
}

export class ProcessorError extends AppError {
  constructor(
    public readonly feedId: string,
    message: string,
    public readonly cause?: Error,
  ) {
    super(`Processing error for feed ${feedId}: ${message}`, 500, cause);
    this.name = "ProcessorError";
  }
}

/**
 * JWT token related errors
 */
export class JwtTokenInvalid extends AuthError {
  constructor(message = "Invalid JWT token") {
    super(message, 401);
    this.name = "JwtTokenInvalid";
  }
}

export class JwtTokenExpired extends AuthError {
  constructor(message = "JWT token has expired") {
    super(message, 401);
    this.name = "JwtTokenExpired";
  }
}

export class JwtTokenSignatureMismatched extends AuthError {
  constructor(message = "JWT token signature mismatch") {
    super(message, 401);
    this.name = "JwtTokenSignatureMismatched";
  }
}
