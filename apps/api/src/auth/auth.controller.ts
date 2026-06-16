import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  HttpCode,
  HttpStatus,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { Public } from './decorators/public.decorator';
import { GetUser } from './decorators/get-user.decorator';
import { CurrentUser } from './interfaces/current-user.interface';

@ApiTags('Auth')
@SkipThrottle()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  private setRefreshTokenCookie(res: Response, refreshToken: string): void {
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/api/v1/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  private clearRefreshTokenCookie(res: Response): void {
    res.clearCookie('refresh_token', {
      httpOnly: true,
      path: '/api/v1/auth',
    });
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Successfully authenticated' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() _loginDto: LoginDto,
  ) {
    const result = await this.authService.login(req.user);
    this.setRefreshTokenCookie(res, result.refreshToken);
    return result;
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userId: string = req.user.sub;
    const refreshToken: string = req.user.refreshToken;
    const result = await this.authService.refreshTokens(userId, refreshToken);
    this.setRefreshTokenCookie(res, result.refreshToken);
    return result;
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  @ApiBearerAuth('JWT-auth')
  async logout(
    @GetUser() user: CurrentUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(user.sub);
    this.clearRefreshTokenCookie(res);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiBearerAuth('JWT-auth')
  me(@GetUser() user: CurrentUser) {
    return user;
  }
}
