// upload.schema.ts
import { z } from 'zod';

export const presignBodySchema = z.object({
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp'], {
    message: 'Unsupported image type',
  }),
  // optional: let the client hint the filename (you still generate the real key)
  fileName: z.string().min(1).max(255).optional(),
  // optional: if you want the client to declare size for pre-validation
  // fileSize: z.number().int().positive().max(5 * 1024 * 1024).optional(),
});

export type PresignInput = z.infer<typeof presignBodySchema>;
