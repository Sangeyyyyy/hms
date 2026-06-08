import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Mark a route as publicly accessible (no JWT required).
 * Use this decorator on routes that should bypass the global JwtAuthGuard.
 *
 * @example
 * @Public()
 * @Get('health')
 * health() { ... }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
