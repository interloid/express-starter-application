import type { ApiError } from '../response/api-response.js';

export class HttpError extends Error {
  readonly statusCode: number;
  readonly errors?: ApiError[];

  constructor(statusCode: number, message: string, errors?: ApiError[]) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    if (errors !== undefined) {
      this.errors = errors;
    }
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class BadRequestError extends HttpError {
  constructor(message = 'Bad request', errors?: ApiError[]) {
    super(400, message, errors);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = 'Unauthorized') {
    super(401, message);
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = 'Forbidden') {
    super(403, message);
  }
}

export class NotFoundError extends HttpError {
  constructor(message = 'Not found') {
    super(404, message);
  }
}

export class ConflictError extends HttpError {
  constructor(message = 'Conflict', errors?: ApiError[]) {
    super(409, message, errors);
  }
}

export class TooManyRequestsError extends HttpError {
  constructor(message = 'Too many requests') {
    super(429, message);
  }
}
