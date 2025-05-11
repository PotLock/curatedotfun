// Base Error Class
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number,
    errorCode: string,
    context?: Record<string, unknown>,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.context = context;
    Object.setPrototypeOf(this, AppError.prototype); // Ensure instanceof works
  }
}

// Specific Error Classes
export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 400, 'VALIDATION_ERROR', context);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resourceName: string, resourceId?: string, context?: Record<string, unknown>) {
    const message = resourceId 
      ? `${resourceName} with ID '${resourceId}' not found.`
      : `${resourceName} not found.`;
    super(message, 404, 'NOT_FOUND_ERROR', context);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 500, 'DATABASE_ERROR', context);
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

export class PluginError extends AppError {
  constructor(pluginName: string, operation: string, originalError?: Error, context?: Record<string, unknown>) {
    const message = `Error in plugin '${pluginName}' during operation '${operation}'.`;
    const errorContext = { 
      ...context, 
      pluginName, 
      operation,
      originalErrorMessage: originalError?.message,
      originalErrorStack: originalError?.stack,
    };
    super(message, 500, 'PLUGIN_ERROR', errorContext);
    Object.setPrototypeOf(this, PluginError.prototype);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'User is not authorized to perform this action.', context?: Record<string, unknown>) {
    super(message, 403, 'AUTHORIZATION_ERROR', context);
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'User authentication failed.', context?: Record<string, unknown>) {
    super(message, 401, 'AUTHENTICATION_ERROR', context);
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

export class ConfigurationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 500, 'CONFIGURATION_ERROR', context);
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }
}

export class ExternalServiceError extends AppError {
  constructor(serviceName: string, message: string, context?: Record<string, unknown>) {
    super(`Error interacting with external service: ${serviceName}. ${message}`, 502, 'EXTERNAL_SERVICE_ERROR', { ...context, serviceName });
    Object.setPrototypeOf(this, ExternalServiceError.prototype);
  }
}

// Utility function to check if an error is an instance of AppError
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
