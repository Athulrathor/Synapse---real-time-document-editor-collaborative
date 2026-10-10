import { HttpException, HttpStatus } from '@nestjs/common';

export interface AppErrorOptions {
  code: string;
  message: string;
  details?: unknown;
  status?: HttpStatus;
}

export class AppException extends HttpException {
  constructor({
    code,
    message,
    details,
    status = HttpStatus.BAD_REQUEST,
  }: AppErrorOptions) {
    super(
      {
        success: false,
        error: {
          code,
          message,
          details,
        },
      },
      status,
    );
  }
}