import { jest } from '@jest/globals';
export const asMock = <T extends (...args: any[]) => any>(fn: T) =>
  fn as unknown as jest.MockedFunction<T>;
