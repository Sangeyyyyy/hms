import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CheckinService } from './checkin.service';
import { PerformCheckInDto } from './dto/perform-checkin.dto';
import { PerformCheckOutDto } from './dto/perform-checkout.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { CurrentUser } from '../auth/interfaces/current-user.interface';

@ApiTags('Check-In / Check-Out')
@ApiBearerAuth('JWT-auth')
@UseGuards(RolesGuard)
@Roles(Role.HOSTEL_MANAGER, Role.FRONT_DESK)
@Controller('checkin')
export class CheckinController {
  constructor(private readonly service: CheckinService) {}

  // ── CHECK-IN ──────────────────────────────────────────────

  @Get('reservations/:id')
  @ApiOperation({ summary: 'Get pre-check-in verification details for a reservation' })
  getCheckInDetails(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getCheckInDetails(id);
  }

  @Post('reservations/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Perform check-in: verifies reservation, records arrival, updates status to CHECKED_IN' })
  @ApiResponse({ status: 200, description: 'Check-in completed' })
  @ApiResponse({ status: 400, description: 'Reservation not in CONFIRMED state' })
  @ApiResponse({ status: 409, description: 'Already checked in' })
  performCheckIn(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PerformCheckInDto,
    @GetUser() user: CurrentUser,
  ) {
    return this.service.performCheckIn(id, dto, user.sub);
  }

  @Get('reservations/:id/record')
  @ApiOperation({ summary: 'Get check-in record (for slip reprint)' })
  getCheckInRecord(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getCheckInRecord(id);
  }

  // ── CHECK-OUT ─────────────────────────────────────────────

  @Get('checkout/reservations/:id')
  @ApiOperation({ summary: 'Get pre-check-out details: inventory and billing summary' })
  getCheckOutDetails(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getCheckOutDetails(id);
  }

  @Post('checkout/reservations/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Perform check-out: records departure, logs damages, optionally posts damage charges' })
  @ApiResponse({ status: 200, description: 'Check-out completed' })
  @ApiResponse({ status: 400, description: 'Reservation not in CHECKED_IN state' })
  @ApiResponse({ status: 409, description: 'Already checked out' })
  performCheckOut(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PerformCheckOutDto,
    @GetUser() user: CurrentUser,
  ) {
    return this.service.performCheckOut(id, dto, user.sub);
  }

  @Get('checkout/reservations/:id/record')
  @ApiOperation({ summary: 'Get check-out record (for slip reprint)' })
  getCheckOutRecord(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getCheckOutRecord(id);
  }
}
