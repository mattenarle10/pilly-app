import { z } from 'zod';

export const preparedProfileAvatarSchema = z.object({
  imageId: z.uuid(),
  uri: z.string().min(1),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  byteCount: z.number().int().positive().max(524_288),
  width: z.number().int().positive().max(512),
  height: z.number().int().positive().max(512),
});

export type PreparedProfileAvatar = z.infer<typeof preparedProfileAvatarSchema>;
