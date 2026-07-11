import 'express';

export interface AuthUser {
  id: string;
  email: string;
  permissions: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
