import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = this.getMessage(exception, statusCode);

    response.status(statusCode).json({
      message,
      statusCode,
    });
  }

  private getMessage(exception: unknown, statusCode: number) {
    if (!(exception instanceof HttpException)) {
      return 'Internal server error';
    }

    const response = exception.getResponse();
    if (typeof response === 'string') return response;
    if (
      response &&
      typeof response === 'object' &&
      'message' in response
    ) {
      const message = (response as { message?: unknown }).message;
      if (Array.isArray(message)) return message.join(', ');
      if (typeof message === 'string') return message;
    }

    return statusCode === HttpStatus.UNAUTHORIZED
      ? 'Authentication required'
      : 'Request failed';
  }
}
