import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Restrict a route to specific roles.
 * Use together with the RolesGuard.
 *
 * @example
 * @Roles(Role.HOSTEL_MANAGER)
 * @Get('admin-only')
 * adminOnly() { ... }
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
