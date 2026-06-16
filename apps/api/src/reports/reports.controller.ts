import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('Reports')
@ApiBearerAuth('JWT-auth')
@UseGuards(RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('summary')
  @Roles(Role.HOSTEL_MANAGER, Role.FRONT_DESK)
  @ApiOperation({ summary: 'Summary stats for dashboard' })
  summary() { return this.service.summaryStats(); }

  // ── Occupancy ───────────────────────────────────────────────
  @Get('occupancy/daily')
  @Roles(Role.HOSTEL_MANAGER, Role.FRONT_DESK)
  @ApiQuery({ name: 'date', example: '2026-06-07' })
  occupancyDaily(@Query('date') date: string) {
    return this.service.occupancyDaily(date || new Date().toISOString().slice(0, 10));
  }

  @Get('occupancy/monthly')
  @Roles(Role.HOSTEL_MANAGER, Role.FRONT_DESK)
  @ApiQuery({ name: 'year', example: '2026' })
  @ApiQuery({ name: 'month', example: '6' })
  occupancyMonthly(@Query('year') year: string, @Query('month') month: string) {
    const now = new Date();
    return this.service.occupancyMonthly(Number(year || now.getFullYear()), Number(month || now.getMonth() + 1));
  }

  @Get('occupancy/annual')
  @Roles(Role.HOSTEL_MANAGER, Role.FRONT_DESK)
  @ApiQuery({ name: 'year', example: '2026' })
  occupancyAnnual(@Query('year') year: string) {
    return this.service.occupancyAnnual(Number(year || new Date().getFullYear()));
  }

  // ── Revenue ────────────────────────────────────────────────
  @Get('revenue/daily')
  @Roles(Role.HOSTEL_MANAGER, Role.FRONT_DESK)
  @ApiQuery({ name: 'date', example: '2026-06-07' })
  revenueDaily(@Query('date') date: string) {
    return this.service.revenueDaily(date || new Date().toISOString().slice(0, 10));
  }

  @Get('revenue/monthly')
  @Roles(Role.HOSTEL_MANAGER, Role.FRONT_DESK)
  @ApiQuery({ name: 'year', example: '2026' })
  @ApiQuery({ name: 'month', example: '6' })
  revenueMonthly(@Query('year') year: string, @Query('month') month: string) {
    const now = new Date();
    return this.service.revenueMonthly(Number(year || now.getFullYear()), Number(month || now.getMonth() + 1));
  }

  @Get('revenue/annual')
  @Roles(Role.HOSTEL_MANAGER, Role.FRONT_DESK)
  @ApiQuery({ name: 'year', example: '2026' })
  revenueAnnual(@Query('year') year: string) {
    return this.service.revenueAnnual(Number(year || new Date().getFullYear()));
  }

  // ── Income Report ──────────────────────────────────────────
  @Get('income')
  @Roles(Role.HOSTEL_MANAGER, Role.FRONT_DESK)
  @ApiOperation({ summary: 'Income report grouped by room type and room number' })
  incomeReport() {
    return this.service.incomeReport();
  }

  @Get('income/export')
  @Roles(Role.HOSTEL_MANAGER, Role.FRONT_DESK)
  @ApiOperation({ summary: 'Export income report as Excel (.xlsx)' })
  async exportIncomeReport(@Res() res: Response) {
    const buffer = await this.service.exportIncomeReportXlsx();
    res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.set('Content-Disposition', 'attachment; filename="income-report.xlsx"');
    res.set('Content-Length', String(buffer.length));
    res.send(buffer);
  }

  // ── Reservations by Client Type ────────────────────────────
  @Get('reservations')
  @Roles(Role.HOSTEL_MANAGER, Role.FRONT_DESK)
  @ApiQuery({ name: 'clientType', enum: ['INTERNAL', 'EXTERNAL'] })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  reservationsByClient(
    @Query('clientType') clientType: 'INTERNAL' | 'EXTERNAL' = 'EXTERNAL',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.reservationsByClientType(clientType, from, to);
  }
}
