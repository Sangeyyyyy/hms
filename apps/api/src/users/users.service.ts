import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { QueryUsersDto } from './dto/query-users.dto';

const SALT_ROUNDS = 12;

// Fields safe to return in API responses (never include password/tokens)
const SAFE_USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  createdById: true,
  createdBy: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // ── List / Search ──────────────────────────────────────────
  async findAll(query: QueryUsersDto) {
    const { search, role, isActive, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      ...(search && {
        OR: [
          { firstName: { contains: search } },
          { lastName: { contains: search } },
          { email: { contains: search } },
        ],
      }),
      ...(role !== undefined && { role }),
      ...(isActive !== undefined && { isActive }),
    };

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: SAFE_USER_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: SAFE_USER_SELECT,
    });
    if (!user) throw new NotFoundException(`User with id "${id}" not found`);
    return user;
  }

  async findRawById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) throw new NotFoundException(`User with id "${id}" not found`);
    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  // ── Create ─────────────────────────────────────────────────
  async create(createUserDto: CreateUserDto, createdById?: string) {
    const exists = await this.findByEmail(createUserDto.email);
    if (exists) {
      throw new ConflictException('A user with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      SALT_ROUNDS,
    );

    return this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
        ...(createdById && { createdById }),
      },
      select: SAFE_USER_SELECT,
    });
  }

  // ── Update Profile (name/email) ────────────────────────────
  async update(id: string, updateUserDto: UpdateUserDto) {
    await this.findById(id); // throws if not found

    // Extract password-related fields — handled separately
    const { password, ...safeData } = updateUserDto as any;

    // Email uniqueness check if changing email
    if (safeData.email) {
      const existing = await this.findByEmail(safeData.email);
      if (existing && existing.id !== id) {
        throw new ConflictException('Email is already in use by another user');
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: safeData,
      select: SAFE_USER_SELECT,
    });
  }

  // ── Toggle Active Status ────────────────────────────────────
  async setActive(id: string, isActive: boolean) {
    await this.findById(id);
    return this.prisma.user.update({
      where: { id },
      data: { isActive, ...(isActive === false && { refreshToken: null }) },
      select: { id: true, isActive: true, updatedAt: true },
    });
  }

  // ── Admin: Reset Password ──────────────────────────────────
  async resetPassword(id: string, dto: ResetPasswordDto) {
    await this.findById(id);

    const hashed = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);
    await this.prisma.user.update({
      where: { id },
      data: {
        password: hashed,
        refreshToken: null, // Force re-login after reset
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    return { message: 'Password reset successfully' };
  }

  // ── Self: Change Password ──────────────────────────────────
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const isCurrentPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException(
        'New password must be different from the current password',
      );
    }

    const hashed = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    return { message: 'Password changed successfully' };
  }

  // ── Auth Helpers ───────────────────────────────────────────
  async updateRefreshToken(userId: string, refreshToken: string) {
    const hashed = await bcrypt.hash(refreshToken, SALT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hashed },
    });
  }

  async clearRefreshToken(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
  }

  async updateLastLogin(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }
}
