export interface ApiErrorResponse {
  statusCode?: number;
  message?: string | string[];
  error?: string;
}

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly details: ApiErrorResponse;

  constructor(
    statusCode: number,
    message: string,
    details: ApiErrorResponse = {},
  ) {
    super(message);

    this.name = "ApiError";
    this.statusCode = statusCode;
    this.details = details;

    Object.setPrototypeOf(this, new.target.prototype);
  }
}