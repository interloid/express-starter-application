import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const randomUUID = jest.fn<() => string>();

const createPresignedPost = jest.fn<
  () => Promise<{
    url: string;
    fields: Record<string, string>;
  }>
>();

jest.unstable_mockModule('node:crypto', () => ({
  randomUUID,
}));

jest.unstable_mockModule('@aws-sdk/s3-presigned-post', () => ({
  createPresignedPost,
}));

jest.unstable_mockModule('../../lib/s3.js', () => ({
  s3Client: {},
}));

const { createPresignedUploadPost } = await import('./upload.service.js');

describe('createPresignedUploadPost', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a presigned upload post', async () => {
    randomUUID.mockReturnValue('uuid-123');

    createPresignedPost.mockResolvedValue({
      url: 'https://bucket.s3.amazonaws.com',
      fields: {
        key: 'uploads/user-1/uuid-123',
      },
    });

    const result = await createPresignedUploadPost('user-1', 'image/png');

    expect(createPresignedPost).toHaveBeenCalledTimes(1);

    expect(result).toEqual({
      url: 'https://bucket.s3.amazonaws.com',
      fields: {
        key: 'uploads/user-1/uuid-123',
      },
    });
  });
});
