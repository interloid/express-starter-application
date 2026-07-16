export interface ApiError {
  field: string | undefined;
  message: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  recordsPerPage: number;
  totalPages: number;
}

export interface CursorPaginated {
  nextCursor: string | null;
  hasMore: boolean;
}

export type JsonValue =
  string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[];

export class ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
  paginationMeta?: PaginationMeta | CursorPaginated;
  metaData?: Record<string, JsonValue>;
  errors?: ApiError[];
  timestamp: string;
  path: string;

  constructor(init: {
    success: boolean;
    statusCode: number;
    message: string;
    path: string;
    data?: T;
    paginationMeta?: PaginationMeta | CursorPaginated;
    metaData?: Record<string, JsonValue>;
    errors?: ApiError[];
  }) {
    this.success = init.success;
    this.statusCode = init.statusCode;
    this.message = init.message;
    this.path = init.path;

    if (init.paginationMeta !== undefined) {
      this.paginationMeta = init.paginationMeta;
    }

    if (init.metaData !== undefined) {
      this.metaData = init.metaData;
    }

    if (init.errors !== undefined) {
      this.errors = init.errors;
    }

    if (init.data !== undefined) {
      this.data = init.data;
    }
    this.timestamp = new Date().toISOString();
  }
}
