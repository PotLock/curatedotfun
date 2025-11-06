import type {
  PluginErrorContext,
  PluginErrorInterface,
} from "@curatedotfun/types";

export enum PluginErrorCode {
  // General Plugin Errors
  UNKNOWN_PLUGIN_ERROR = "UNKNOWN_PLUGIN_ERROR",
  PLUGIN_INITIALIZATION_FAILED = "PLUGIN_INITIALIZATION_FAILED",
  PLUGIN_SHUTDOWN_FAILED = "PLUGIN_SHUTDOWN_FAILED",
  PLUGIN_AUTHENTICATION_FAILURE = "PLUGIN_AUTHENTICATION_FAILURE",
  PLUGIN_AUTHORIZATION_FAILURE = "PLUGIN_AUTHORIZATION_FAILURE",
  PLUGIN_CONFIG_INVALID = "PLUGIN_CONFIG_INVALID",
  PLUGIN_INPUT_VALIDATION_FAILED = "PLUGIN_INPUT_VALIDATION_FAILED",
  PLUGIN_OUTPUT_VALIDATION_FAILED = "PLUGIN_OUTPUT_VALIDATION_FAILED",
  PLUGIN_RATE_LIMITED = "PLUGIN_RATE_LIMITED",
  PLUGIN_TIMEOUT = "PLUGIN_TIMEOUT",
  PLUGIN_OPERATION_UNSUPPORTED = "PLUGIN_OPERATION_UNSUPPORTED",
  PLUGIN_INTERNAL_ERROR = "PLUGIN_INTERNAL_ERROR",
}

export enum AppErrorCode {
  // General & Unknown
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",

  // Authentication & Authorization
  AUTHENTICATION_FAILED = "AUTHENTICATION_FAILED",
  UNAUTHENTICATED = "UNAUTHENTICATED",
  FORBIDDEN = "FORBIDDEN",
  JWT_TOKEN_INVALID = "JWT_TOKEN_INVALID",
  JWT_TOKEN_EXPIRED = "JWT_TOKEN_EXPIRED",
  JWT_TOKEN_SIGNATURE_MISMATCHED = "JWT_TOKEN_SIGNATURE_MISMATCHED",

  // Validation
  VALIDATION_ERROR = "VALIDATION_ERROR",

  // Resource Management
  RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND",
  RESOURCE_CONFLICT = "RESOURCE_CONFLICT",

  // Database
  DATABASE_ERROR = "DATABASE_ERROR",
  DB_QUERY_FAILED = "DB_QUERY_FAILED",
  DB_CONNECTION_ERROR = "DB_CONNECTION_ERROR",

  // Service & Business Logic
  SERVICE_ERROR = "SERVICE_ERROR",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
  EXTERNAL_SERVICE_FAILURE = "EXTERNAL_SERVICE_FAILURE",

  // Application Specific
  SUBMISSION_SERVICE_ERROR = "SUBMISSION_SERVICE_ERROR",
  USER_SERVICE_ERROR = "USER_SERVICE_ERROR",
  ACTIVITY_SERVICE_ERROR = "ACTIVITY_SERVICE_ERROR",
  NEAR_ACCOUNT_ERROR = "NEAR_ACCOUNT_ERROR",
  PLUGIN_FAILURE = "PLUGIN_FAILURE",
  TRANSFORM_ERROR = "TRANSFORM_ERROR",
  PROCESSOR_ERROR = "PROCESSOR_ERROR",
  CONFIG_ERROR = "CONFIG_ERROR",
}

// Step 2: Enhanced Base AppError
export class AppError extends Error {
  public readonly errorCode: AppErrorCode;
  public readonly statusCode: number;
  public readonly details?: unknown;
  public readonly isOperational: boolean;
  public readonly cause?: Error;

  constructor(
    message: string,
    errorCode: AppErrorCode,
    statusCode: number,
    options?: {
      cause?: Error;
      details?: unknown;
      isOperational?: boolean;
    },
  ) {
    super(message);
    this.name = this.constructor.name;
    this.errorCode = errorCode;
    this.statusCode = statusCode;
    this.details = options?.details;
    this.isOperational =
      options?.isOperational !== undefined ? options.isOperational : true;

    if (options?.cause) {
      this.cause = options.cause;
    }

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: this.name,
      errorCode: this.errorCode,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      // Consider adding stack in development:
      // stack: process.env.NODE_ENV === 'development' && this.stack ? this.stack.split('\n') : undefined,
    };
  }
}

// Step 3: Refactor Specific Error Classes

export class AuthError extends AppError {
  constructor(
    message: string,
    errorCode: AppErrorCode = AppErrorCode.AUTHENTICATION_FAILED,
    statusCode: number = 401,
    options?: { cause?: Error; details?: unknown },
  ) {
    super(message, errorCode, statusCode, options);
  }
}

export class JwtTokenInvalid extends AuthError {
  constructor(message = "Invalid JWT token", options?: { cause?: Error }) {
    super(message, AppErrorCode.JWT_TOKEN_INVALID, 401, options);
  }
}

export class JwtTokenExpired extends AuthError {
  constructor(message = "JWT token has expired", options?: { cause?: Error }) {
    super(message, AppErrorCode.JWT_TOKEN_EXPIRED, 401, options);
  }
}

export class JwtTokenSignatureMismatched extends AuthError {
  constructor(
    message = "JWT token signature mismatch",
    options?: { cause?: Error },
  ) {
    super(message, AppErrorCode.JWT_TOKEN_SIGNATURE_MISMATCHED, 401, options);
  }
}

export class ValidationError extends AppError {
  public readonly validationDetails?: Record<string, string[]>;

  constructor(
    message: string = "Input validation failed",
    validationDetails?: Record<string, string[]>,
    options?: { cause?: Error },
  ) {
    super(message, AppErrorCode.VALIDATION_ERROR, 400, {
      ...options,
      details: validationDetails,
    });
    this.validationDetails = validationDetails;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      details: this.validationDetails || this.details,
    };
  }
}

export class ServiceError extends AppError {
  constructor(
    message: string,
    errorCode: AppErrorCode = AppErrorCode.SERVICE_ERROR,
    statusCode: number = 500,
    options?: { cause?: Error; details?: unknown },
  ) {
    super(message, errorCode, statusCode, options);
  }
}

export class DatabaseError extends AppError {
  public readonly dbErrorCode?: string;

  constructor(
    message: string,
    dbErrorCode?: string,
    options?: { cause?: Error },
  ) {
    super(message, AppErrorCode.DATABASE_ERROR, 500, {
      ...options,
      details: { dbErrorCode },
    });
    this.dbErrorCode = dbErrorCode;
  }
  toJSON() {
    const baseJson = super.toJSON();
    return {
      ...baseJson,
      details: {
        ...(typeof baseJson.details === "object" ? baseJson.details : {}),
        dbErrorCode: this.dbErrorCode,
      },
    };
  }
}

export class NotFoundError extends AppError {
  constructor(
    resource: string,
    identifier?: string | number,
    options?: { cause?: Error },
  ) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, AppErrorCode.RESOURCE_NOT_FOUND, 404, options);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, options?: { cause?: Error }) {
    super(message, AppErrorCode.RESOURCE_CONFLICT, 409, options);
  }
}

export class AuthorizationError extends AppError {
  constructor(
    message: string,
    statusCode: number = 403,
    options?: { cause?: Error; details?: unknown },
  ) {
    super(message, AppErrorCode.FORBIDDEN, statusCode, options);
  }
}

// --- Application/Plugin Specific Errors ---
export class ModerationServiceError extends ServiceError {
  constructor(
    message: string,
    statusCode: number = 500,
    options?: { cause?: Error },
  ) {
    super(message, AppErrorCode.SERVICE_ERROR, statusCode, options);
  }
}

export class SubmissionServiceError extends ServiceError {
  constructor(
    message: string,
    statusCode: number = 500,
    options?: { cause?: Error },
  ) {
    super(message, AppErrorCode.SUBMISSION_SERVICE_ERROR, statusCode, options);
  }
}
export class ForbiddenError extends ServiceError {
  constructor(message = "Forbidden", statusCode: number = 403) {
    super(message, AppErrorCode.FORBIDDEN, statusCode);
  }
}

export class UserServiceError extends ServiceError {
  constructor(
    message: string,
    statusCode: number = 500,
    options?: { cause?: Error },
  ) {
    super(message, AppErrorCode.USER_SERVICE_ERROR, statusCode, options);
  }
}

export class ActivityServiceError extends ServiceError {
  constructor(
    message: string,
    options?: { statusCode?: number; cause?: Error },
  ) {
    super(
      message,
      AppErrorCode.ACTIVITY_SERVICE_ERROR,
      options?.statusCode || 500,
      options,
    );
  }
}

export class NearAccountError extends ServiceError {
  constructor(
    message: string,
    statusCode: number = 400,
    options?: { cause?: Error },
  ) {
    super(message, AppErrorCode.NEAR_ACCOUNT_ERROR, statusCode, options);
  }
}

export type TransformStage = "global" | "distributor" | "batch";

export class TransformError extends AppError {
  constructor(
    public readonly plugin: string,
    public readonly stage: TransformStage,
    public readonly index: number,
    message: string,
    options?: { cause?: Error },
  ) {
    super(
      `Transform error in ${stage} transform #${index + 1} (${plugin}): ${message}`,
      AppErrorCode.TRANSFORM_ERROR,
      500,
      options,
    );
  }
}

export class ProcessorError extends AppError {
  constructor(
    public readonly feedId: string,
    message: string,
    options?: { cause?: Error },
  ) {
    super(
      `Processing error for feed ${feedId}: ${message}`,
      AppErrorCode.PROCESSOR_ERROR,
      500,
      options,
    );
  }
}

export class ConfigError extends AppError {
  constructor(message: string, options?: { cause?: Error; details?: unknown }) {
    super(message, AppErrorCode.CONFIG_ERROR, 500, options);
  }
}

export class PluginError extends AppError implements PluginErrorInterface {
  public readonly context: PluginErrorContext;
  public readonly pluginErrorCode: PluginErrorCode;
  public readonly retryable: boolean;

  constructor(
    message: string,
    context: PluginErrorContext,
    pluginErrorCode: PluginErrorCode,
    retryable: boolean = false,
    options?: {
      cause?: Error; // This will be the originalError from the plugin
      details?: unknown;
      isOperational?: boolean;
      statusCode?: number; // Allow overriding statusCode if needed, defaults to 500
    },
  ) {
    super(
      message,
      AppErrorCode.PLUGIN_FAILURE, // Use the general plugin failure category
      options?.statusCode || 500, // Default to 500 if not specified
      {
        cause: options?.cause,
        details: {
          ...(options?.details || {}),
          pluginContext: context,
          pluginErrorCode,
        },
        isOperational:
          options?.isOperational !== undefined ? options.isOperational : true,
      },
    );
    this.name = "PluginError";
    this.context = context;
    this.pluginErrorCode = pluginErrorCode;
    this.retryable = retryable;
  }

  get originalError(): Error | undefined {
    return this.cause instanceof Error ? this.cause : undefined;
  }

  toJSON() {
    const baseJson = super.toJSON();
    // Ensure details from AppError are preserved and augmented
    const existingDetails =
      typeof baseJson.details === "object" && baseJson.details !== null
        ? baseJson.details
        : {};
    return {
      ...baseJson,
      details: {
        ...existingDetails, // Spread existing details from AppError's toJSON
        pluginContext: this.context, // Add plugin-specific context
      },
      pluginErrorCode: this.pluginErrorCode,
      retryable: this.retryable,
      // originalError: this.originalError ? { name: this.originalError.name, message: this.originalError.message } : undefined,
    };
  }
}
