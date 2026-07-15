import { randomUUID } from 'node:crypto';
import { s3Client } from '../../lib/s3.js';
import { env } from '../../config/env.config.js';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';

export function createPresignedUploadPost(userId: string, contentType: string) {
  const key = `uploads/${userId}/${randomUUID()}`;
  return createPresignedPost(s3Client, {
    Bucket: env.AWS_S3_BUCKET_NAME,
    Key: key,
    Conditions: [
      ['content-length-range', 0, 5 * 1024 * 1024],
      ['eq', '$Content-Type', contentType],
    ],
    Fields: { 'Content-Type': contentType },
    Expires: 300,
  });
}
