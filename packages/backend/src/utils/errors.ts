import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with id ${id} not found` : `${resource} not found`;
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public details?: any) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

export function handleError(
  error: Error | FastifyError | AppError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Log the error
  request.log.error(error);

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return reply.status(400).send({
      success: false,
      error: 'Validation Error',
      code: 'VALIDATION_ERROR',
      details: error.errors.map((err) => ({
        path: err.path.join('.'),
        message: err.message,
      })),
    });
  }

  // Handle custom AppError
  if (error instanceof AppError) {
    const response: any = {
      success: false,
      error: error.message,
      code: error.code || 'ERROR',
    };

    if (error instanceof ValidationError && error.details) {
      response.details = error.details;
    }

    return reply.status(error.statusCode).send(response);
  }

  // Handle Fastify validation errors
  if ('validation' in error && error.validation) {
    return reply.status(400).send({
      success: false,
      error: 'Validation Error',
      code: 'VALIDATION_ERROR',
      details: error.validation,
    });
  }

  // Handle Prisma errors
  if (error.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as any;

    // Unique constraint violation
    if (prismaError.code === 'P2002') {
      return reply.status(409).send({
        success: false,
        error: 'Resource already exists',
        code: 'CONFLICT',
      });
    }

    // Record not found
    if (prismaError.code === 'P2025') {
      return reply.status(404).send({
        success: false,
        error: 'Resource not found',
        code: 'NOT_FOUND',
      });
    }
  }

  // Default error response
  const statusCode = 'statusCode' in error ? (error.statusCode as number) : 500;
  return reply.status(statusCode).send({
    success: false,
    error: error.message || 'Internal Server Error',
    code: 'INTERNAL_ERROR',
  });
}

// Standard success response wrapper
export function successResponse<T>(data: T, message?: string) {
  return {
    success: true,
    data,
    ...(message && { message }),
  };
}
