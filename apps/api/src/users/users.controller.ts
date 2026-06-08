import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { CurrentUser } from '../auth/interfaces/current-user.interface';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@UseGuards(RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ── User Management (Manager only) ────────────────────────

  @Get()
  @Roles(Role.HOSTEL_MANAGER)
  @ApiOperation({ summary: 'List users with pagination & search (Manager only)' })
  findAll(@Query() query: QueryUsersDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @Roles(Role.HOSTEL_MANAGER)
  @ApiOperation({ summary: 'Get a user by ID (Manager only)' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findById(id);
  }

  @Post()
  @Roles(Role.HOSTEL_MANAGER)
  @ApiOperation({ summary: 'Create a new user (Manager only)' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  create(
    @Body() createUserDto: CreateUserDto,
    @GetUser() currentUser: CurrentUser,
  ) {
    return this.usersService.create(createUserDto, currentUser.sub);
  }

  @Patch(':id')
  @Roles(Role.HOSTEL_MANAGER)
  @ApiOperation({ summary: 'Update a user profile (Manager only)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(':id/activate')
  @Roles(Role.HOSTEL_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate a user (Manager only)' })
  activate(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.setActive(id, true);
  }

  @Patch(':id/deactivate')
  @Roles(Role.HOSTEL_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate a user, clears session (Manager only)' })
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.setActive(id, false);
  }

  @Patch(':id/reset-password')
  @Roles(Role.HOSTEL_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin reset a user password (Manager only)' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  resetPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.usersService.resetPassword(id, dto);
  }

  // ── Self-Service (any authenticated user) ─────────────────

  @Patch('me/change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change own password (any authenticated user)' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 401, description: 'Current password incorrect' })
  changePassword(
    @GetUser() user: CurrentUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(user.sub, dto);
  }

  @Get('me/profile')
  @ApiOperation({ summary: 'Get own profile (any authenticated user)' })
  getMyProfile(@GetUser() user: CurrentUser) {
    return this.usersService.findById(user.sub);
  }

  @Patch('me/profile')
  @ApiOperation({ summary: 'Update own profile name (any authenticated user)' })
  updateMyProfile(
    @GetUser() user: CurrentUser,
    @Body() dto: UpdateUserDto,
  ) {
    // Self can only update name — not role/isActive
    const { role, isActive, email, ...safeDto } = dto as any;
    return this.usersService.update(user.sub, safeDto);
  }
}
