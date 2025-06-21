import { z } from "zod";

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: any,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string, id: string | number) {
    super(`${resource} with ID ${id} not found`, 404);
  }
}

export class BadRequestError extends ApiError {
  constructor(message: string, details?: any) {
    super(message, 400, details);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = "Unauthorized") {
    super(message, 401);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = "Forbidden") {
    super(message, 403);
  }
}

export class InternalServerError extends ApiError {
  constructor(message = "Internal Server Error", details?: any) {
    super(message, 500, details);
  }
}

export class NearAccountError extends ApiError {
  constructor(message: string, statusCode = 500, details?: any) {
    super(message, statusCode, details);
  }
}

export class UserServiceError extends ApiError {
  constructor(message: string, statusCode = 500, details?: any) {
    super(message, statusCode, details);
  }
}

export class ActivityServiceError extends ApiError {
  constructor(message: string, statusCode = 500, details?: any) {
    super(message, statusCode, details);
  }
}

export const ApiErrorResponseSchema = z.object({
  statusCode: z.number(),
  success: z.literal(false),
  error: z.object({
    message: z.string(),
    details: z.any().optional(),
  }),
});
