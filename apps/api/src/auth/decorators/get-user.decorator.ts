import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CurrentUser } from '../interfaces/current-user.interface';

/**
 * Parameter decorator to extract the authenticated user from the request.
 *
 * @example
 * @Get('profile')
 * getProfile(@GetUser() user: CurrentUser) { ... }
 */
export const GetUser = createParamDecorator(
  (data: keyof CurrentUser | undefined, ctx: ExecutionContext): CurrentUser | any => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as CurrentUser;
    return data ? user?.[data] : user;
  },
);
