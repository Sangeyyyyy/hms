import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { Role, ReservationStatus } from '@prisma/client';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { QueryReservationsDto } from './dto/query-reservations.dto';
import { CreateChargeDto } from './dto/create-charge.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { CurrentUser } from '../auth/interfaces/current-user.interface';

@ApiTags('Reservations')
@ApiBearerAuth('JWT-auth')
@UseGuards(RolesGuard)
@Roles(Role.HOSTEL_MANAGER, Role.FRONT_DESK)
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly service: ReservationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new reservation (Manager & Front Desk)' })
  @ApiResponse({ status: 201, description: 'Reservation created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid date ranges or inactive facility selection' })
  @ApiResponse({ status: 409, description: 'Double-booking conflict detected' })
  create(
    @Body() dto: CreateReservationDto,
    @GetUser() user: CurrentUser,
  ) {
    return this.service.create(dto, user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'List and filter reservations' })
  findAll(@Query() query: QueryReservationsDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get reservation details by ID' })
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update reservation info/facilities' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReservationDto,
  ) {
    return this.service.update(id, dto);
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Perform state change (Check-in, Check-out, Cancel, etc.)' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: ReservationStatus,
  ) {
    return this.service.updateStatus(id, status);
  }

  // ── BILLING & CHARGES ENDPOINTS ──────────────────────────────────────

  @Get(':id/billing')
  @ApiOperation({ summary: 'Get reservation billing summary, charges and payments' })
  getBillingSummary(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getBillingSummary(id);
  }

  @Post(':id/charges')
  @ApiOperation({ summary: 'Add a manual charge to a reservation' })
  addCharge(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateChargeDto,
  ) {
    return this.service.addCharge(id, dto);
  }

  @Delete(':id/charges/:chargeId')
  @ApiOperation({ summary: 'Remove a manual charge from a reservation' })
  removeCharge(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('chargeId', ParseUUIDPipe) chargeId: string,
  ) {
    return this.service.removeCharge(id, chargeId);
  }

  // ── PAYMENTS ENDPOINTS ───────────────────────────────────────────────

  @Post(':id/payments')
  @ApiOperation({ summary: 'Record a payment towards a reservation' })
  addPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.service.addPayment(id, dto);
  }

  @Delete(':id/payments/:paymentId')
  @ApiOperation({ summary: 'Remove a payment record' })
  removePayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
  ) {
    return this.service.removePayment(id, paymentId);
  }
}
