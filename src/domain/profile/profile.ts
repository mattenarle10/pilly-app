import { z } from 'zod';

export const profileSettingKeys = {
  displayName: 'profileName',
  firstName: 'profileFirstName',
  lastName: 'profileLastName',
  photoUri: 'profilePhotoUri',
} as const;

export const profileNameSchema = z.object({
  firstName: z.string().trim().max(40),
  lastName: z.string().trim().max(40),
});

export type ProfileName = z.infer<typeof profileNameSchema>;

export function normalizeProfileName(input: ProfileName): ProfileName {
  return profileNameSchema.parse(input);
}

export function profileDisplayName(profile: ProfileName): string {
  return [profile.firstName, profile.lastName].filter(Boolean).join(' ');
}

export function resolveProfileName({
  firstName,
  lastName,
  legacyDisplayName,
}: {
  firstName: string | null | undefined;
  lastName: string | null | undefined;
  legacyDisplayName: string | null | undefined;
}): ProfileName {
  const legacyParts = (legacyDisplayName ?? '').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: firstName ?? legacyParts[0] ?? '',
    lastName: lastName ?? legacyParts.slice(1).join(' '),
  };
}
