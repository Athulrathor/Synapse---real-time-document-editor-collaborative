import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();

    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'An unexpected error occurred.';
    let details: unknown = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();

      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const errorResponse = exceptionResponse as Record<string, any>;

        code =
          typeof errorResponse.code === 'string'
            ? errorResponse.code
            : this.getDefaultCode(status);

        message =
          typeof errorResponse.error.message === 'string'
            ? errorResponse.error.message
            : Array.isArray(errorResponse.error.message)
              ? errorResponse.error.message.length <= 1 ? errorResponse.error.message[0] : JSON.stringify(errorResponse.error.message)
              : errorResponse.error.message;
        if (
          errorResponse.error &&
          typeof errorResponse.error === 'object' &&
          'details' in errorResponse.error
        ) {
          details = (errorResponse.error as { details?: unknown }).details;
        }
        console.log(errorResponse)
      }
    } else if (exception instanceof Error) {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception.stack,
      );
    }

    response.status(status).json({
      success: false,
      error: {
        code,
        message,
        ...(details !== undefined && { details }),
      },
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private getDefaultCode(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';

      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';

      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';

      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';

      case HttpStatus.CONFLICT:
        return 'CONFLICT';

      case HttpStatus.TOO_MANY_REQUESTS:
        return 'TOO_MANY_REQUESTS';

      default:
        return 'HTTP_ERROR';
    }
  }
}