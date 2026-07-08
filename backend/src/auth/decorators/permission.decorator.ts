import { SetMetadata } from '@nestjs/common';

/** Areas an OWNER can restrict a STAFF user from. Ignored for OWNER, who
 * always has full access. */
export type PermissionKey = 'checkIn' | 'certificates' | 'eventos';

export const PERMISSION_KEY = 'permission';
export const RequirePermission = (permission: PermissionKey) =>
  SetMetadata(PERMISSION_KEY, permission);
