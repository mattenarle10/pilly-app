import { z } from 'zod';

const envSchema = z.object({
  EXPO_PUBLIC_REVENUECAT_IOS_KEY: z.string().min(1).optional(),
  EXPO_PUBLIC_PLUS_PREVIEW_MODE: z.enum(['store', 'free', 'active']).optional(),
  EXPO_PUBLIC_PLUS_PURCHASES_ENABLED: z.enum(['true', 'false']).optional(),
});

export const env = envSchema.parse({
  EXPO_PUBLIC_REVENUECAT_IOS_KEY: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || undefined,
  EXPO_PUBLIC_PLUS_PREVIEW_MODE: process.env.EXPO_PUBLIC_PLUS_PREVIEW_MODE || undefined,
  EXPO_PUBLIC_PLUS_PURCHASES_ENABLED: process.env.EXPO_PUBLIC_PLUS_PURCHASES_ENABLED || undefined,
});
