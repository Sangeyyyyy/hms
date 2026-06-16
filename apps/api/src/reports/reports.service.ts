import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReservationStatus, ClientType } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Helpers ────────────────────────────────────────────────
  private dayRange(date: string) {
    const d = new Date(date);
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const end = new Date(start.getTime() + 86400000);
    return { start, end };
  }

  private monthRange(year: number, month: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    return { start, end };
  }

  private yearRange(year: number) {
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);
    return { start, end };
  }

  private totalCharge(charges: { amount: number; quantity: number }[]) {
    return charges.reduce((s, c) => s + c.amount * c.quantity, 0);
  }

  private totalPaid(payments: { amount: number }[]) {
    return payments.reduce((s, p) => s + p.amount, 0);
  }

  // ── OCCUPANCY REPORTS ──────────────────────────────────────

  async occupancyDaily(from: string, to?: string) {
    const totalFacilities = await this.prisma.facility.count({ where: { isActive: true } });

    // Single day
    if (!to) {
      const { start, end } = this.dayRange(from);
      const [checkedIn, byStatus, checkInRecords] = await Promise.all([
        this.prisma.reservation.count({
          where: {
            status: { in: [ReservationStatus.CHECKED_IN, ReservationStatus.CHECKED_OUT, ReservationStatus.COMPLETED] },
            checkInDate: { gte: start, lt: end },
          },
        }),
        this.prisma.reservation.groupBy({
          by: ['status'],
          where: { checkInDate: { gte: start, lt: end } },
          _count: { id: true },
        }),
        this.prisma.checkInRecord.count({
          where: { actualArrivalAt: { gte: start, lt: end } },
        }),
      ]);
      return {
        date: from,
        totalFacilities,
        checkedIn,
        checkInRecords,
        occupancyRate: totalFacilities > 0 ? Math.round((checkedIn / totalFacilities) * 100) : 0,
        byStatus: byStatus.map(s => ({ status: s.status, count: s._count.id })),
      };
    }

    // Date range
    const start = new Date(from);
    const end = new Date(to + 'T23:59:59.999Z');
    const totalDays = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;

    const [allReservations, allCheckInRecords] = await Promise.all([
      this.prisma.reservation.findMany({
        where: {
          status: { in: [ReservationStatus.CHECKED_IN, ReservationStatus.CHECKED_OUT, ReservationStatus.COMPLETED] },
          checkInDate: { gte: start, lt: end },
        },
        select: { id: true, status: true, checkInDate: true },
      }),
      this.prisma.checkInRecord.findMany({
        where: { actualArrivalAt: { gte: start, lt: end } },
        select: { id: true, actualArrivalAt: true },
      }),
    ]);

    const statusMap = new Map<string, number>();
    for (const r of allReservations) {
      statusMap.set(r.status, (statusMap.get(r.status) || 0) + 1);
    }

    const dailyData: { date: string; checkedIn: number; checkInRecords: number }[] = [];
    for (let d = 0; d < totalDays; d++) {
      const dayStart = new Date(start.getFullYear(), start.getMonth(), start.getDate() + d);
      const dayEnd = new Date(dayStart.getTime() + 86400000);
      const dateStr = dayStart.toISOString().slice(0, 10);

      let dayCheckedIn = 0;
      let dayCheckInRecords = 0;

      for (const r of allReservations) {
        const ci = new Date(r.checkInDate);
        if (ci >= dayStart && ci < dayEnd) {
          dayCheckedIn++;
        }
      }
      for (const rec of allCheckInRecords) {
        const at = new Date(rec.actualArrivalAt);
        if (at >= dayStart && at < dayEnd) {
          dayCheckInRecords++;
        }
      }
      dailyData.push({ date: dateStr, checkedIn: dayCheckedIn, checkInRecords: dayCheckInRecords });
    }

    const totalCheckedIn = dailyData.reduce((s, d) => s + d.checkedIn, 0);
    const totalCheckInRecords = dailyData.reduce((s, d) => s + d.checkInRecords, 0);
    const avgOccupancyRate = totalFacilities > 0 ? Math.round((totalCheckedIn / (totalFacilities * totalDays)) * 100) : 0;

    return {
      from, to, totalDays,
      totalFacilities,
      checkedIn: totalCheckedIn,
      checkInRecords: totalCheckInRecords,
      occupancyRate: avgOccupancyRate,
      byStatus: Array.from(statusMap.entries()).map(([status, count]) => ({ status, count })),
      dailyBreakdown: dailyData.map(d => ({
        ...d,
        occupancyRate: totalFacilities > 0 ? Math.round((d.checkedIn / totalFacilities) * 100) : 0,
      })),
    };
  }

  async occupancyMonthly(from: string, to?: string) {
    const totalFacilities = await this.prisma.facility.count({ where: { isActive: true } });
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const parseMonth = (s: string) => {
      const [y, m] = s.split('-').map(Number);
      return { year: y, month: m };
    };

    const { year: fy, month: fm } = parseMonth(from);
    const { year: ty, month: tm } = to ? parseMonth(to) : { year: fy, month: fm };

    // Single month
    if (!to) {
      const { start, end } = this.monthRange(fy, fm);
      const daysInMonth = new Date(fy, fm, 0).getDate();
      const reservations = await this.prisma.reservation.findMany({
        where: {
          status: { in: [ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN, ReservationStatus.CHECKED_OUT, ReservationStatus.COMPLETED] },
          checkInDate: { gte: start, lt: end },
        },
        include: { facilities: true },
      });

      const daily: { day: number; count: number; facilityCount: number }[] = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const dayStart = new Date(fy, fm - 1, d);
        const dayEnd = new Date(fy, fm - 1, d + 1);
        const dayRes = reservations.filter(r => {
          const ci = new Date(r.checkInDate);
          return ci >= dayStart && ci < dayEnd;
        });
        daily.push({
          day: d,
          count: dayRes.length,
          facilityCount: dayRes.reduce((s, r) => s + r.facilities.length, 0),
        });
      }

      const totalReservations = reservations.length;
      const peakDay = daily.reduce((max, d) => d.count > max.count ? d : max, daily[0]);

      return {
        year: fy, month: fm,
        totalFacilities,
        totalReservations,
        daysInMonth,
        avgDailyOccupancy: Math.round(totalReservations / daysInMonth),
        peakDay: peakDay?.day,
        occupancyRate: totalFacilities > 0 ? Math.round((totalReservations / (totalFacilities * daysInMonth)) * 100) : 0,
        daily,
      };
    }

    // Month range
    const monthStart = new Date(fy, fm - 1, 1);
    const monthEnd = new Date(ty, tm, 0, 23, 59, 59, 999);

    const reservations = await this.prisma.reservation.findMany({
      where: {
        status: { in: [ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN, ReservationStatus.CHECKED_OUT, ReservationStatus.COMPLETED] },
        checkInDate: { gte: monthStart, lt: monthEnd },
      },
      include: { facilities: true },
    });

    const monthly: { month: number; label: string; count: number; facilityCount: number }[] = [];
    const totalMonths = (ty * 12 + tm) - (fy * 12 + fm) + 1;

    for (let i = 0; i < totalMonths; i++) {
      const m = fm + i;
      const y = fy + Math.floor((m - 1) / 12);
      const mo = ((m - 1) % 12) + 1;
      const { start: ms, end: me } = this.monthRange(y, mo);

      const monthRes = reservations.filter(r => {
        const ci = new Date(r.checkInDate);
        return ci >= ms && ci < me;
      });

      monthly.push({
        month: mo,
        label: monthNames[mo - 1],
        count: monthRes.length,
        facilityCount: monthRes.reduce((s, r) => s + r.facilities.length, 0),
      });
    }

    const totalReservations = monthly.reduce((s, m) => s + m.count, 0);
    const peakMonth = monthly.reduce((max, m) => m.count > max.count ? m : max, monthly[0]);

    return {
      from, to,
      totalMonths,
      totalFacilities,
      totalReservations,
      avgMonthlyOccupancy: Math.round(totalReservations / totalMonths),
      peakMonth: peakMonth?.label,
      peakMonthNum: peakMonth?.month,
      occupancyRate: totalFacilities > 0
        ? Math.round((totalReservations / (totalFacilities * totalMonths * 30)) * 100)
        : 0,
      monthlyBreakdown: monthly,
    };
  }

  async occupancyAnnual(year: number) {
    const { start, end } = this.yearRange(year);
    const totalFacilities = await this.prisma.facility.count({ where: { isActive: true } });

    const monthly: { month: number; label: string; count: number; facilityCount: number }[] = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let m = 1; m <= 12; m++) {
      const { start: ms, end: me } = this.monthRange(year, m);
      const reservations = await this.prisma.reservation.findMany({
        where: {
          status: { in: [ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN, ReservationStatus.CHECKED_OUT, ReservationStatus.COMPLETED] },
          checkInDate: { gte: ms, lt: me },
        },
        include: { facilities: true },
      });
      monthly.push({
        month: m,
        label: monthNames[m - 1],
        count: reservations.length,
        facilityCount: reservations.reduce((s, r) => s + r.facilities.length, 0),
      });
    }

    const totalReservations = monthly.reduce((s, m) => s + m.count, 0);
    const peakMonth = monthly.reduce((max, m) => m.count > max.count ? m : max, monthly[0]);

    return {
      year,
      totalFacilities,
      totalReservations,
      avgMonthlyOccupancy: Math.round(totalReservations / 12),
      peakMonth: peakMonth?.label,
      monthly,
    };
  }

  // ── REVENUE REPORTS ────────────────────────────────────────

  async revenueDaily(date: string) {
    const { start, end } = this.dayRange(date);

    const reservations = await this.prisma.reservation.findMany({
      where: {
        status: { notIn: [ReservationStatus.DRAFT, ReservationStatus.CANCELLED] },
        checkInDate: { gte: start, lt: end },
      },
      include: { charges: true, payments: true },
    });

    const totalCharges = reservations.reduce((s, r) => s + this.totalCharge(r.charges), 0);
    const totalPaid = reservations.reduce((s, r) => s + this.totalPaid(r.payments), 0);
    const totalBalance = totalCharges - totalPaid;

    // Payment breakdown by method
    const allPayments = reservations.flatMap(r => r.payments);
    const byMethod = allPayments.reduce<Record<string, number>>((acc, p) => {
      acc[p.method] = (acc[p.method] || 0) + p.amount;
      return acc;
    }, {});

    return {
      date,
      reservationCount: reservations.length,
      totalCharges,
      totalPaid,
      totalBalance,
      collectionRate: totalCharges > 0 ? Math.round((totalPaid / totalCharges) * 100) : 0,
      paymentByMethod: byMethod,
    };
  }

  async revenueMonthly(year: number, month: number) {
    const { start, end } = this.monthRange(year, month);

    const reservations = await this.prisma.reservation.findMany({
      where: {
        status: { notIn: [ReservationStatus.DRAFT, ReservationStatus.CANCELLED] },
        checkInDate: { gte: start, lt: end },
      },
      include: { charges: true, payments: true },
    });

    const daysInMonth = new Date(year, month, 0).getDate();
    const daily: { day: number; charges: number; payments: number }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dayStart = new Date(year, month - 1, d);
      const dayEnd = new Date(year, month - 1, d + 1);
      const dayRes = reservations.filter(r => {
        const ci = new Date(r.checkInDate);
        return ci >= dayStart && ci < dayEnd;
      });
      daily.push({
        day: d,
        charges: dayRes.reduce((s, r) => s + this.totalCharge(r.charges), 0),
        payments: dayRes.reduce((s, r) => s + this.totalPaid(r.payments), 0),
      });
    }

    const totalCharges = reservations.reduce((s, r) => s + this.totalCharge(r.charges), 0);
    const totalPaid = reservations.reduce((s, r) => s + this.totalPaid(r.payments), 0);
    const allPayments = reservations.flatMap(r => r.payments);
    const byMethod = allPayments.reduce<Record<string, number>>((acc, p) => {
      acc[p.method] = (acc[p.method] || 0) + p.amount;
      return acc;
    }, {});

    return {
      year, month,
      reservationCount: reservations.length,
      totalCharges,
      totalPaid,
      totalBalance: totalCharges - totalPaid,
      collectionRate: totalCharges > 0 ? Math.round((totalPaid / totalCharges) * 100) : 0,
      paymentByMethod: byMethod,
      daily,
    };
  }

  async revenueAnnual(year: number) {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthly: { month: number; label: string; charges: number; payments: number }[] = [];

    for (let m = 1; m <= 12; m++) {
      const { start, end } = this.monthRange(year, m);
      const reservations = await this.prisma.reservation.findMany({
        where: {
          status: { notIn: [ReservationStatus.DRAFT, ReservationStatus.CANCELLED] },
          checkInDate: { gte: start, lt: end },
        },
        include: { charges: true, payments: true },
      });
      monthly.push({
        month: m,
        label: monthNames[m - 1],
        charges: reservations.reduce((s, r) => s + this.totalCharge(r.charges), 0),
        payments: reservations.reduce((s, r) => s + this.totalPaid(r.payments), 0),
      });
    }

    const totalCharges = monthly.reduce((s, m) => s + m.charges, 0);
    const totalPaid = monthly.reduce((s, m) => s + m.payments, 0);
    const peakMonth = monthly.reduce((max, m) => m.charges > max.charges ? m : max, monthly[0]);

    return {
      year,
      totalCharges,
      totalPaid,
      totalBalance: totalCharges - totalPaid,
      collectionRate: totalCharges > 0 ? Math.round((totalPaid / totalCharges) * 100) : 0,
      peakMonth: peakMonth?.label,
      monthly,
    };
  }

  // ── RESERVATION REPORTS ────────────────────────────────────

  async reservationsByClientType(clientType: 'INTERNAL' | 'EXTERNAL', from?: string, to?: string) {
    const where: any = { clientType: clientType as ClientType };
    if (from) where.checkInDate = { ...where.checkInDate, gte: new Date(from) };
    if (to) where.checkInDate = { ...where.checkInDate, lte: new Date(to) };

    const reservations = await this.prisma.reservation.findMany({
      where,
      include: {
        facilities: { include: { facility: { include: { facilityType: true } } } },
        charges: true,
        payments: true,
        occupants: true,
        createdBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { checkInDate: 'desc' },
    });

    const byStatus = await this.prisma.reservation.groupBy({
      by: ['status'],
      where,
      _count: { id: true },
    });

    const totalRevenue = reservations.reduce((s, r) => s + this.totalCharge(r.charges), 0);
    const totalCollected = reservations.reduce((s, r) => s + this.totalPaid(r.payments), 0);

    return {
      clientType,
      from: from || null,
      to: to || null,
      total: reservations.length,
      totalRevenue,
      totalCollected,
      byStatus: byStatus.map(s => ({ status: s.status, count: s._count.id })),
      reservations: reservations.map(r => ({
        id: r.id,
        reservationNumber: r.reservationNumber,
        status: r.status,
        clientType: r.clientType,
        holderName: `${r.holderFirstName} ${r.holderLastName}`,
        holderEmail: r.holderEmail,
        checkInDate: r.checkInDate,
        checkOutDate: r.checkOutDate,
        facilities: r.facilities.map(rf => rf.facility.facilityCode),
        totalCharges: this.totalCharge(r.charges),
        totalPaid: this.totalPaid(r.payments),
        balance: this.totalCharge(r.charges) - this.totalPaid(r.payments),
      })),
    };
  }

  // ── SUMMARY STATS (dashboard) ─────────────────────────────
  async summaryStats() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalReservations,
      activeGuests,
      pendingReservations,
      todayCheckIns,
      todayCheckOuts,
      monthlyRevenue,
      totalFacilities,
      internalCount,
      externalCount,
    ] = await Promise.all([
      this.prisma.reservation.count(),
      this.prisma.reservation.count({ where: { status: ReservationStatus.CHECKED_IN } }),
      this.prisma.reservation.count({ where: { status: ReservationStatus.PENDING } }),
      this.prisma.reservation.count({ where: { checkInDate: { gte: todayStart }, status: { not: ReservationStatus.CANCELLED } } }),
      this.prisma.reservation.count({ where: { checkOutDate: { gte: todayStart }, status: { in: [ReservationStatus.CHECKED_OUT, ReservationStatus.COMPLETED] } } }),
      this.prisma.charge.aggregate({
        _sum: { amount: true },
        where: { reservation: { checkInDate: { gte: monthStart }, status: { notIn: [ReservationStatus.DRAFT, ReservationStatus.CANCELLED] } } },
      }),
      this.prisma.facility.count({ where: { isActive: true } }),
      this.prisma.reservation.count({ where: { clientType: ClientType.INTERNAL } }),
      this.prisma.reservation.count({ where: { clientType: ClientType.EXTERNAL } }),
    ]);

    return {
      totalReservations,
      activeGuests,
      pendingReservations,
      todayCheckIns,
      todayCheckOuts,
      monthlyRevenue: monthlyRevenue._sum.amount || 0,
      totalFacilities,
      clientBreakdown: { internal: internalCount, external: externalCount },
    };
  }

  // ── INCOME REPORT (by Room Type & Room Number) ─────────────────

  async incomeReport(period?: string, from?: string, to?: string) {
    const where: any = {
      status: {
        in: [ReservationStatus.COMPLETED, ReservationStatus.CHECKED_OUT],
      },
    };

    if (period === 'daily' && from && to) {
      where.checkInDate = {
        gte: new Date(from + 'T00:00:00.000Z'),
        lte: new Date(to + 'T23:59:59.999Z'),
      };
    } else if (period === 'monthly' && from && to) {
      const [fy, fm] = from.split('-').map(Number);
      const [ty, tm] = to.split('-').map(Number);
      where.checkInDate = {
        gte: new Date(fy, fm - 1, 1),
        lte: new Date(ty, tm, 0, 23, 59, 59, 999),
      };
    } else if (period === 'annual' && from) {
      const y = Number(from);
      where.checkInDate = {
        gte: new Date(y, 0, 1),
        lt: new Date(y + 1, 0, 1),
      };
    }

    const reservations = await this.prisma.reservation.findMany({
      where,
      include: {
        facilities: {
          include: {
            facility: {
              include: { facilityType: true },
            },
          },
        },
      },
    });

    const groups = new Map<
      string,
      { roomType: string; roomNumber: string; bookings: number; income: number }
    >();

    for (const reservation of reservations) {
      const checkIn = new Date(reservation.checkInDate);
      const checkOut = new Date(reservation.checkOutDate);
      const nights = Math.max(
        1,
        Math.round(
          (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
        ),
      );

      for (const rf of reservation.facilities) {
        const roomType = rf.facility.facilityType.name;
        const roomNumber = rf.facility.facilityCode;
        const key = `${roomType}|${roomNumber}`;

        if (!groups.has(key)) {
          groups.set(key, { roomType, roomNumber, bookings: 0, income: 0 });
        }
        const group = groups.get(key)!;
        group.bookings += 1;
        group.income += rf.rateApplied * nights;
      }
    }

    const rows = Array.from(groups.values());
    rows.sort((a, b) => {
      if (b.income !== a.income) return b.income - a.income;
      if (a.roomType !== b.roomType)
        return a.roomType.localeCompare(b.roomType);
      return a.roomNumber.localeCompare(b.roomNumber);
    });

    const typeMap = new Map<string, number>();
    for (const row of rows) {
      typeMap.set(row.roomType, (typeMap.get(row.roomType) || 0) + row.income);
    }
    let mostProfitableType = '';
    let maxTypeIncome = 0;
    for (const [type, income] of typeMap) {
      if (income > maxTypeIncome) {
        maxTypeIncome = income;
        mostProfitableType = type;
      }
    }

    const totalRevenue = rows.reduce((s, r) => s + r.income, 0);
    const totalBookings = rows.reduce((s, r) => s + r.bookings, 0);
    const highestEarningRoom = rows.length > 0 ? rows[0] : null;

    return {
      generatedAt: new Date().toISOString(),
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalBookings,
      mostProfitableRoomType: mostProfitableType || 'N/A',
      highestEarningRoom: highestEarningRoom
        ? `${highestEarningRoom.roomNumber} (${highestEarningRoom.roomType})`
        : 'N/A',
      rows: rows.map((r) => ({
        roomType: r.roomType,
        roomNumber: r.roomNumber,
        totalBookings: r.bookings,
        totalIncome: Math.round(r.income * 100) / 100,
        avgIncomePerBooking:
          r.bookings > 0
            ? Math.round((r.income / r.bookings) * 100) / 100
            : 0,
      })),
    };
  }

  // ── EXCEL EXPORT ───────────────────────────────────────────

  async exportIncomeReportXlsx(period?: string, from?: string, to?: string): Promise<Buffer> {
    const ExcelJS = require('exceljs');
    const data = await this.incomeReport(period, from, to);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'DNSC RMS';
    workbook.created = new Date();

    const ws = workbook.addWorksheet('Income Report');

    ws.columns = [
      { header: 'Room Type', key: 'roomType', width: 22 },
      { header: 'Room Number', key: 'roomNumber', width: 16 },
      { header: 'Total Bookings', key: 'totalBookings', width: 18 },
      { header: 'Total Income', key: 'totalIncome', width: 20 },
      { header: 'Avg Income/Booking', key: 'avgIncomePerBooking', width: 22 },
    ];

    const DARK_BLUE = 'FF1E3A5F';
    const WHITE = 'FFFFFFFF';
    const LIGHT_GRAY = 'FFF2F2F2';
    const BORDER_STYLE = {
      style: 'thin' as const,
      color: { argb: 'FFCCCCCC' },
    };
    const border = {
      top: BORDER_STYLE,
      left: BORDER_STYLE,
      bottom: BORDER_STYLE,
      right: BORDER_STYLE,
    };
    const currencyFormat = '₱#,##0.00';

    ws.mergeCells(1, 1, 1, 5);
    const headerCell = ws.getCell('A1');
    headerCell.value = 'DNSC RMS \u2013 Income Report by Room Type and Room Number';
    headerCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: DARK_BLUE } };
    headerCell.alignment = { horizontal: 'left', vertical: 'middle' };
    ws.getRow(1).height = 32;

    ws.mergeCells(2, 1, 2, 5);
    const dateCell = ws.getCell('A2');
    dateCell.value = `Generated: ${new Date(data.generatedAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'full', timeStyle: 'long' })}`;
    dateCell.font = { name: 'Calibri', size: 11, italic: true, color: { argb: 'FF666666' } };
    ws.getRow(2).height = 22;

    ws.getRow(3).height = 8;

    const summaryLabels = ['Total Revenue', 'Total Bookings', 'Most Profitable Room Type', 'Highest Earning Room'];
    const summaryValues = [
      `₱${data.totalRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
      String(data.totalBookings),
      data.mostProfitableRoomType,
      data.highestEarningRoom,
    ];

    for (let i = 0; i < summaryLabels.length; i++) {
      const r = 4 + i;
      ws.mergeCells(r, 1, r, 2);
      ws.mergeCells(r, 3, r, 5);

      const labelCell = ws.getCell(r, 1);
      labelCell.value = summaryLabels[i];
      labelCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: DARK_BLUE } };
      labelCell.alignment = { horizontal: 'right', vertical: 'middle' };
      labelCell.border = border;

      const valCell = ws.getCell(r, 3);
      valCell.value = summaryValues[i];
      valCell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF333333' } };
      valCell.alignment = { horizontal: 'left', vertical: 'middle' };
      valCell.border = border;

      ws.getRow(r).height = 24;
    }

    ws.getRow(8).height = 8;

    const headerRow = ws.getRow(9);
    ws.columns.forEach((col, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = col.header;
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: WHITE } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK_BLUE } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = border;
    });
    headerRow.height = 28;

    const lastDataRow = 9 + data.rows.length;
    ws.autoFilter = {
      from: { row: 9, column: 1 },
      to: { row: lastDataRow, column: 5 },
    };

    for (let i = 0; i < data.rows.length; i++) {
      const row = data.rows[i];
      const excelRow = ws.getRow(10 + i);
      const isEven = i % 2 === 0;

      excelRow.getCell(1).value = row.roomType;
      excelRow.getCell(2).value = row.roomNumber;
      excelRow.getCell(3).value = row.totalBookings;
      excelRow.getCell(4).value = row.totalIncome;
      excelRow.getCell(4).numFmt = currencyFormat;
      excelRow.getCell(5).value = row.avgIncomePerBooking;
      excelRow.getCell(5).numFmt = currencyFormat;

      for (let c = 1; c <= 5; c++) {
        const cell = excelRow.getCell(c);
        cell.font = { name: 'Calibri', size: 11, color: { argb: 'FF333333' } };
        cell.alignment = {
          horizontal: c >= 3 ? 'right' : 'left',
          vertical: 'middle',
        };
        cell.border = border;
        if (isEven) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: LIGHT_GRAY },
          };
        }
      }

      excelRow.height = 22;
    }

    const totalRowNum = 10 + data.rows.length;
    const totalRow = ws.getRow(totalRowNum);
    totalRow.getCell(1).value = 'TOTAL';
    totalRow.getCell(1).font = { name: 'Calibri', size: 11, bold: true, color: { argb: DARK_BLUE } };
    totalRow.getCell(2).value = '';
    totalRow.getCell(3).value = data.totalBookings;
    totalRow.getCell(3).font = { name: 'Calibri', size: 11, bold: true, color: { argb: DARK_BLUE } };
    totalRow.getCell(4).value = data.totalRevenue;
    totalRow.getCell(4).numFmt = currencyFormat;
    totalRow.getCell(4).font = { name: 'Calibri', size: 11, bold: true, color: { argb: DARK_BLUE } };
    totalRow.getCell(5).value = data.totalBookings > 0 ? data.totalRevenue / data.totalBookings : 0;
    totalRow.getCell(5).numFmt = currencyFormat;
    totalRow.getCell(5).font = { name: 'Calibri', size: 11, bold: true, color: { argb: DARK_BLUE } };

    for (let c = 1; c <= 5; c++) {
      const cell = totalRow.getCell(c);
      cell.alignment = { horizontal: c >= 3 ? 'right' : 'left', vertical: 'middle' };
      cell.border = {
        top: { style: 'medium', color: { argb: DARK_BLUE } },
        left: BORDER_STYLE,
        bottom: { style: 'double', color: { argb: DARK_BLUE } },
        right: BORDER_STYLE,
      };
    }
    totalRow.height = 26;

    ws.views = [{ state: 'frozen', ySplit: 9, xSplit: 0, activeCell: 'A10' }];

    ws.pageSetup.orientation = 'landscape';
    ws.pageSetup.fitToPage = true;
    ws.pageSetup.fitToWidth = 1;
    ws.pageSetup.paperSize = 9;

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
