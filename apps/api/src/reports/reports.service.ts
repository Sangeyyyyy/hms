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

  async occupancyDaily(date: string) {
    const { start, end } = this.dayRange(date);
    const totalFacilities = await this.prisma.facility.count({ where: { isActive: true } });

    const checkedIn = await this.prisma.reservation.count({
      where: {
        status: { in: [ReservationStatus.CHECKED_IN, ReservationStatus.CHECKED_OUT, ReservationStatus.COMPLETED] },
        checkInDate: { gte: start, lt: end },
      },
    });

    const byStatus = await this.prisma.reservation.groupBy({
      by: ['status'],
      where: { checkInDate: { gte: start, lt: end } },
      _count: { id: true },
    });

    const checkInRecords = await this.prisma.checkInRecord.count({
      where: { actualArrivalAt: { gte: start, lt: end } },
    });

    return {
      date,
      totalFacilities,
      checkedIn,
      checkInRecords,
      occupancyRate: totalFacilities > 0 ? Math.round((checkedIn / totalFacilities) * 100) : 0,
      byStatus: byStatus.map(s => ({ status: s.status, count: s._count.id })),
    };
  }

  async occupancyMonthly(year: number, month: number) {
    const { start, end } = this.monthRange(year, month);
    const totalFacilities = await this.prisma.facility.count({ where: { isActive: true } });
    const daysInMonth = new Date(year, month, 0).getDate();

    const reservations = await this.prisma.reservation.findMany({
      where: {
        status: { in: [ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN, ReservationStatus.CHECKED_OUT, ReservationStatus.COMPLETED] },
        checkInDate: { gte: start, lt: end },
      },
      include: { facilities: true },
    });

    // Build daily breakdown
    const daily: { day: number; count: number; facilityCount: number }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dayStart = new Date(year, month - 1, d);
      const dayEnd = new Date(year, month - 1, d + 1);
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
      year, month,
      totalFacilities,
      totalReservations,
      daysInMonth,
      avgDailyOccupancy: Math.round(totalReservations / daysInMonth),
      peakDay: peakDay?.day,
      occupancyRate: totalFacilities > 0 ? Math.round((totalReservations / (totalFacilities * daysInMonth)) * 100) : 0,
      daily,
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
      todayCheckIns,
      todayCheckOuts,
      monthlyRevenue,
      totalFacilities,
      internalCount,
      externalCount,
    ] = await Promise.all([
      this.prisma.reservation.count(),
      this.prisma.reservation.count({ where: { status: ReservationStatus.CHECKED_IN } }),
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
      todayCheckIns,
      todayCheckOuts,
      monthlyRevenue: monthlyRevenue._sum.amount || 0,
      totalFacilities,
      clientBreakdown: { internal: internalCount, external: externalCount },
    };
  }
}
