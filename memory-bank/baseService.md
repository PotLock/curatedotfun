# BaseService Implementation Reference

This document provides a reference implementation for the BaseService abstract class that all services should extend. The BaseService provides standardized error handling, logging, lifecycle management, and health checking capabilities.

## Core Functionality

The BaseService provides:

1. **Standardized Error Handling**: Consistent error handling with proper typing and context
2. **Lifecycle Management**: Initialize and shutdown methods for proper service lifecycle
3. **Logging**: Consistent logging patterns with service context
4. **Health Checking**: Standard health check interface
5. **Error Recovery**: Strategies for recovering from errors
6. **Graceful Degradation**: Support for fallback behavior when services fail

## Implementation

```typescript
import { logger, Logger } from "../utils/logger";

/**
 * Error class for service-specific errors
 */
export class ServiceError extends Error {
  constructor(
    public readonly service: string,
    public readonly operation: string,
    message: string,
    public readonly cause?: Error
  ) {
    super(`${service}.${operation}: ${message}`);
    this.name = 'ServiceError';
  }
}

/**
 * Health status for services
 */
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

/**
 * Health check result
 */
export interface HealthCheckResult {
  status: HealthStatus;
  details?: Record<string, any>;
}

/**
 * Abstract base class for all services
 */
export abstract class BaseService {
  protected readonly logger: Logger;
  protected readonly serviceName: string;
  
  constructor(serviceName: string) {
    this.serviceName = serviceName;
    this.logger = logger.child({ service: serviceName });
  }
  
  /**
   * Initialize the service
   * This should be called before using the service
   */
  public abstract async initialize(): Promise<void>;
  
  /**
   * Shutdown the service
   * This should be called when the service is no longer needed
   */
  public abstract async shutdown(): Promise<void>;
  
  /**
   * Execute an operation with standardized error handling
   * 
   * @param operation The operation to execute
   * @param operationName The name of the operation (for error reporting)
   * @param context Additional context for error reporting
   * @param defaultValue Optional default value to return on error
   * @returns The result of the operation or the default value if provided and an error occurs
   * @throws ServiceError if an error occurs and no default value is provided
   */
  protected async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    operationName: string,
    context?: Record<string, any>,
    defaultValue?: T
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      this.handleError(error, operationName, context);
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw this.wrapError(error, operationName);
    }
  }
  
  /**
   * Handle an error
   * This logs the error with appropriate context
   * 
   * @param error The error to handle
   * @param operationName The name of the operation that caused the error
   * @param context Additional context for error reporting
   */
  protected handleError(
    error: unknown, 
    operationName: string, 
    context?: Record<string, any>
  ): void {
    const errorDetails = this.extractErrorDetails(error);
    this.logger.error(
      `Error in ${this.serviceName}.${operationName}`,
      { error: errorDetails, context }
    );
  }
  
  /**
   * Extract detailed error information
   * 
   * @param error The error to extract details from
   * @returns An object with error details
   */
  protected extractErrorDetails(error: unknown): Record<string, any> {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorDetails: Record<string, any> = {
      message: errorMessage,
      stack: errorStack,
    };
    
    // Extract additional properties if available
    if (error instanceof Error && typeof error === "object") {
      // Common error properties
      const errorProps = [
        "code",
        "name",
        "cause",
        "detail",
        "hint",
      ];
      
      for (const prop of errorProps) {
        if (prop in error) {
          errorDetails[prop] = (error as any)[prop];
        }
      }
      
      // Check for nested error objects
      if ("cause" in error && error.cause instanceof Error) {
        errorDetails.cause = this.extractErrorDetails(error.cause);
      }
    }
    
    return errorDetails;
  }
  
  /**
   * Wrap an error in a ServiceError
   * 
   * @param error The error to wrap
   * @param operationName The name of the operation that caused the error
   * @returns A ServiceError
   */
  protected wrapError(error: unknown, operationName: string): ServiceError {
    if (error instanceof ServiceError) {
      return error;
    }
    
    if (error instanceof Error) {
      return new ServiceError(
        this.serviceName,
        operationName,
        error.message,
        error
      );
    }
    
    return new ServiceError(
      this.serviceName,
      operationName,
      String(error)
    );
  }
  
  /**
   * Check the health of the service
   * 
   * @returns A health check result
   */
  public async healthCheck(): Promise<HealthCheckResult> {
    try {
      return await this.checkHealth();
    } catch (error) {
      this.logger.error("Health check failed", { error });
      return {
        status: 'unhealthy',
        details: {
          error: this.extractErrorDetails(error),
        },
      };
    }
  }
  
  /**
   * Implement service-specific health check
   * This should be overridden by derived classes
   * 
   * @returns A health check result
   */
  protected async checkHealth(): Promise<HealthCheckResult> {
    return { status: 'healthy' };
  }
}
```

## Example Usage

Here's an example of how to implement a service using the BaseService:

```typescript
import { BaseService, ServiceError } from "./base-service";

export class ExampleService extends BaseService {
  private initialized = false;
  
  constructor() {
    super("ExampleService");
  }
  
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    try {
      // Perform initialization
      this.logger.info("Initializing ExampleService");
      
      // Example: Connect to external service
      await this.executeWithErrorHandling(
        async () => {
          // Connect to external service
          await this.connectToExternalService();
        },
        "initialize",
        { attempt: 1 }
      );
      
      this.initialized = true;
      this.logger.info("ExampleService initialized successfully");
    } catch (error) {
      this.logger.error("Failed to initialize ExampleService", { error });
      throw this.wrapError(error, "initialize");
    }
  }
  
  public async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }
    
    try {
      // Perform cleanup
      this.logger.info("Shutting down ExampleService");
      
      // Example: Disconnect from external service
      await this.executeWithErrorHandling(
        async () => {
          // Disconnect from external service
          await this.disconnectFromExternalService();
        },
        "shutdown"
      );
      
      this.initialized = false;
      this.logger.info("ExampleService shut down successfully");
    } catch (error) {
      this.logger.error("Failed to shut down ExampleService cleanly", { error });
      // Don't throw here, as we're shutting down anyway
    }
  }
  
  public async performOperation(param: string): Promise<string> {
    if (!this.initialized) {
      throw new ServiceError(this.serviceName, "performOperation", "Service not initialized");
    }
    
    return this.executeWithErrorHandling(
      async () => {
        // Perform the operation
        return `Processed: ${param}`;
      },
      "performOperation",
      { param }
    );
  }
  
  public async performOperationWithFallback(param: string): Promise<string> {
    if (!this.initialized) {
      throw new ServiceError(this.serviceName, "performOperationWithFallback", "Service not initialized");
    }
    
    return this.executeWithErrorHandling(
      async () => {
        // Attempt the operation
        // This might fail
        throw new Error("Operation failed");
      },
      "performOperationWithFallback",
      { param },
      `Fallback for: ${param}` // Default value if operation fails
    );
  }
  
  protected async checkHealth(): Promise<HealthCheckResult> {
    if (!this.initialized) {
      return {
        status: 'unhealthy',
        details: {
          reason: 'Service not initialized',
        },
      };
    }
    
    // Check external service health
    const externalServiceHealth = await this.checkExternalServiceHealth();
    
    if (!externalServiceHealth) {
      return {
        status: 'degraded',
        details: {
          reason: 'External service unhealthy',
        },
      };
    }
    
    return {
      status: 'healthy',
      details: {
        uptime: process.uptime(),
      },
    };
  }
  
  // Private methods
  private async connectToExternalService(): Promise<void> {
    // Implementation
  }
  
  private async disconnectFromExternalService(): Promise<void> {
    // Implementation
  }
  
  private async checkExternalServiceHealth(): Promise<boolean> {
    // Implementation
    return true;
  }
}
```

## Migration Strategy

To migrate existing services to use the BaseService:

1. Create the BaseService class in a new file (e.g., `src/services/base/base-service.ts`)
2. Update each service to extend BaseService
3. Implement the required abstract methods (initialize, shutdown)
4. Replace custom error handling with executeWithErrorHandling
5. Add health check implementation
6. Update service initialization in app.ts to call initialize() on each service
7. Update shutdown handling to call shutdown() on each service

## Benefits

- **Consistent Error Handling**: All services handle errors in the same way
- **Improved Logging**: Standardized logging with service context
- **Lifecycle Management**: Clear initialization and shutdown procedures
- **Health Checking**: Standard health check interface for monitoring
- **Error Recovery**: Consistent strategies for recovering from errors
- **Graceful Degradation**: Support for fallback behavior when services fail

## Considerations

- **Backward Compatibility**: Ensure existing code continues to work during migration
- **Testing**: Update tests to account for new error handling patterns
- **Performance**: Monitor for any performance impacts from the new error handling
- **Complexity**: Balance standardization with simplicity
