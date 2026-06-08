import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { QueryReservationsDto } from './dto/query-reservations.dto';
import { CreateChargeDto } from './dto/create-charge.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Prisma, ReservationStatus, ChargeType, PaymentMethod } from '@prisma/client';

@Injectable()
export class ReservationsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Create Reservation ─────────────────────────────────────
  async create(dto: CreateReservationDto, createdById?: string) {
    const checkIn = new Date(dto.checkInDate);
    const checkOut = new Date(dto.checkOutDate);

    if (checkIn >= checkOut) {
      throw new BadRequestException('Check-out date must be after check-in date');
    }

    const now = new Date();
    // Allow small margin of error (15 mins) for check-ins starting right now
    now.setMinutes(now.getMinutes() - 15);
    if (checkIn < now) {
      throw new BadRequestException('Check-in date cannot be in the past');
    }

    // 1. Verify all facility IDs exist and are active
    const facilities = await this.prisma.facility.findMany({
      where: {
        id: { in: dto.facilityIds },
      },
      include: { facilityType: true },
    });

    if (facilities.length !== dto.facilityIds.length) {
      throw new NotFoundException('One or more selected facilities do not exist');
    }

    const inactive = facilities.filter((f) => !f.isActive);
    if (inactive.length > 0) {
      throw new BadRequestException(
        `Facilities: [${inactive.map((f) => f.facilityCode).join(', ')}] are inactive`
      );
    }

    // 2. Prevent overlapping bookings (excluding Cancelled & No Show)
    const overlaps = await this.prisma.reservationFacility.findMany({
      where: {
        facilityId: { in: dto.facilityIds },
        reservation: {
          status: { notIn: [ReservationStatus.CANCELLED, ReservationStatus.NO_SHOW] },
          checkInDate: { lt: checkOut },
          checkOutDate: { gt: checkIn },
        },
      },
      include: {
        facility: true,
      },
    });

    if (overlaps.length > 0) {
      const bookedCodes = Array.from(new Set(overlaps.map((o) => o.facility.facilityCode)));
      throw new ConflictException(
        `Facilities [${bookedCodes.join(', ')}] are already reserved for the selected dates`
      );
    }

    // 3. Generate Reservation Number (HMS-YYYYMMDD-XXXX)
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const countToday = await this.prisma.reservation.count({
      where: {
        createdAt: { gte: startOfDay },
      },
    });

    const nextSeq = (countToday + 1).toString().padStart(4, '0');
    const reservationNumber = `HMS-${todayStr}-${nextSeq}`;

    // 4. Create reservation transaction
    return this.prisma.$transaction(async (tx) => {
      // A. Create main reservation entry
      const reservation = await tx.reservation.create({
        data: {
          reservationNumber,
          holderFirstName: dto.holderFirstName,
          holderLastName: dto.holderLastName,
          holderEmail: dto.holderEmail,
          holderPhone: dto.holderPhone,
          holderAddress: dto.holderAddress,
          holderCity: dto.holderCity,
          holderState: dto.holderState,
          holderZipCode: dto.holderZipCode,
          holderCountry: dto.holderCountry,
          holderGender: dto.holderGender,
          preferredContactMethod: dto.preferredContactMethod,
          emergencyContactName: dto.emergencyContactName,
          emergencyContactPhone: dto.emergencyContactPhone,
          emergencyContactRelation: dto.emergencyContactRelation,
          functionHallPreferredTime: dto.functionHallPreferredTime,
          hasAvailedBefore: dto.hasAvailedBefore,
          referralSource: dto.referralSource,
          checkInDate: checkIn,
          checkOutDate: checkOut,
          notes: dto.notes,
          status: ReservationStatus.PENDING,
          clientType: dto.clientType,
          createdById,
        },
      });

      // B. Create joined facilities (capturing current rate)
      await tx.reservationFacility.createMany({
        data: dto.facilityIds.map((fid) => {
          const f = facilities.find((fac) => fac.id === fid);
          return {
            reservationId: reservation.id,
            facilityId: fid,
            rateApplied: f?.facilityType.defaultRate || 0,
          };
        }),
      });

      // C. Create occupants list
      if (dto.occupants && dto.occupants.length > 0) {
        await tx.reservationOccupant.createMany({
          data: dto.occupants.map((occ) => ({
            reservationId: reservation.id,
            firstName: occ.firstName,
            lastName: occ.lastName,
            email: occ.email,
            phone: occ.phone,
          })),
        });
      }

      // D. Auto-populate base Room / Function Hall charges
      const nightsCount = Math.max(1, Math.ceil(
        (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
      ));
      
      const initialCharges = facilities.map((f) => {
        const isFunctionHall = f.facilityType.name.toUpperCase().includes('FUNCTION');
        const chargeType = isFunctionHall ? ChargeType.FUNCTION_HALL_CHARGE : ChargeType.ROOM_CHARGE;
        return {
          reservationId: reservation.id,
          description: `${f.facilityCode} - Base ${isFunctionHall ? 'Rent' : 'Stay'} (${nightsCount} night${nightsCount !== 1 ? 's' : ''})`,
          quantity: 1,
          amount: (f.facilityType.defaultRate || 0) * nightsCount,
          type: chargeType,
        };
      });

      await tx.charge.createMany({
        data: initialCharges,
      });

      return tx.reservation.findUnique({
        where: { id: reservation.id },
        include: {
          facilities: {
            include: {
              facility: {
                include: { facilityType: true },
              },
            },
          },
          occupants: true,
          charges: true,
          payments: true,
          createdBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });
    });
  }

  // ── Find All / Query ───────────────────────────────────────
  async findAll(query: QueryReservationsDto) {
    const { search, status, checkInFrom, checkInTo, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ReservationWhereInput = {
      ...(status && { status }),
      ...((checkInFrom || checkInTo) && {
        checkInDate: {
          ...(checkInFrom && { gte: new Date(checkInFrom) }),
          ...(checkInTo && { lte: new Date(checkInTo) }),
        },
      }),
      ...(search && {
        OR: [
          { reservationNumber: { contains: search } },
          { holderFirstName: { contains: search } },
          { holderLastName: { contains: search } },
          { holderEmail: { contains: search } },
          { holderPhone: { contains: search } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.reservation.findMany({
        where,
        include: {
          facilities: {
            include: {
              facility: {
                include: { facilityType: true },
              },
            },
          },
          occupants: true,
          charges: true,
          payments: true,
        },
        orderBy: { checkInDate: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.reservation.count({ where }),
    ]);

    // Format billing summaries dynamically
    const formattedData = data.map((r) => {
      const totalCharges = r.charges.reduce((sum, c) => sum + c.amount * c.quantity, 0);
      const totalPayments = r.payments.reduce((sum, p) => sum + p.amount, 0);
      const remainingBalance = totalCharges - totalPayments;
      let paymentStatus = 'UNPAID';
      if (totalPayments > 0) {
        paymentStatus = remainingBalance <= 0 ? 'PAID' : 'PARTIALLY_PAID';
      }
      return {
        ...r,
        billingSummary: {
          totalCharges,
          totalPayments,
          remainingBalance,
          paymentStatus,
        },
      };
    });

    return {
      data: formattedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ── Find By ID ─────────────────────────────────────────────
  async findById(id: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: {
        facilities: {
          include: {
            facility: {
              include: { facilityType: true },
            },
          },
        },
        occupants: true,
        charges: true,
        payments: true,
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation with ID "${id}" not found`);
    }

    const totalCharges = reservation.charges.reduce((sum, c) => sum + c.amount * c.quantity, 0);
    const totalPayments = reservation.payments.reduce((sum, p) => sum + p.amount, 0);
    const remainingBalance = totalCharges - totalPayments;
    let paymentStatus = 'UNPAID';
    if (totalPayments > 0) {
      paymentStatus = remainingBalance <= 0 ? 'PAID' : 'PARTIALLY_PAID';
    }

    return {
      ...reservation,
      billingSummary: {
        totalCharges,
        totalPayments,
        remainingBalance,
        paymentStatus,
      },
    };
  }

  // ── Update Reservation ─────────────────────────────────────
  async update(id: string, dto: UpdateReservationDto) {
    const existing = await this.findById(id);

    if (dto.status === ReservationStatus.CHECKED_OUT && existing.billingSummary.remainingBalance > 0) {
      throw new BadRequestException('Cannot check out: There is an outstanding balance.');
    }

    // If changing dates, make sure we perform overlaps check
    const checkIn = dto.checkInDate ? new Date(dto.checkInDate) : existing.checkInDate;
    const checkOut = dto.checkOutDate ? new Date(dto.checkOutDate) : existing.checkOutDate;

    if (checkIn >= checkOut) {
      throw new BadRequestException('Check-out date must be after check-in date');
    }

    // Check facility overlap changes
    const targetFacilityIds = dto.facilityIds || existing.facilities.map((f) => f.facilityId);

    if (dto.checkInDate || dto.checkOutDate || dto.facilityIds) {
      const overlaps = await this.prisma.reservationFacility.findMany({
        where: {
          facilityId: { in: targetFacilityIds },
          reservationId: { not: id },
          reservation: {
            status: { notIn: [ReservationStatus.CANCELLED, ReservationStatus.NO_SHOW] },
            checkInDate: { lt: checkOut },
            checkOutDate: { gt: checkIn },
          },
        },
        include: {
          facility: true,
        },
      });

      if (overlaps.length > 0) {
        const bookedCodes = Array.from(new Set(overlaps.map((o) => o.facility.facilityCode)));
        throw new ConflictException(
          `Facilities [${bookedCodes.join(', ')}] are already reserved for the selected dates`
        );
      }
    }

    // Run updates in a transaction
    return this.prisma.$transaction(async (tx) => {
      // A. Update details
      await tx.reservation.update({
        where: { id },
        data: {
          status: dto.status,
          holderFirstName: dto.holderFirstName,
          holderLastName: dto.holderLastName,
          holderEmail: dto.holderEmail,
          holderPhone: dto.holderPhone,
          checkInDate: checkIn,
          checkOutDate: checkOut,
          notes: dto.notes,
          clientType: dto.clientType,
        },
      });

      // B. Re-sync facilities if provided
      if (dto.facilityIds) {
        // Fetch new rates
        const newFacilities = await tx.facility.findMany({
          where: { id: { in: dto.facilityIds } },
          include: { facilityType: true },
        });

        // Delete old relation
        await tx.reservationFacility.deleteMany({
          where: { reservationId: id },
        });

        // Insert new relations
        await tx.reservationFacility.createMany({
          data: dto.facilityIds.map((fid) => {
            const f = newFacilities.find((fac) => fac.id === fid);
            return {
              reservationId: id,
              facilityId: fid,
              rateApplied: f?.facilityType.defaultRate || 0,
            };
          }),
        });
      }

      // C. Re-sync occupants if provided
      if (dto.occupants) {
        await tx.reservationOccupant.deleteMany({
          where: { reservationId: id },
        });

        if (dto.occupants.length > 0) {
          await tx.reservationOccupant.createMany({
            data: dto.occupants.map((occ) => ({
              reservationId: id,
              firstName: occ.firstName,
              lastName: occ.lastName,
              email: occ.email,
              phone: occ.phone,
            })),
          });
        }
      }

      return tx.reservation.findUnique({
        where: { id },
        include: {
          facilities: {
            include: {
              facility: {
                include: { facilityType: true },
              },
            },
          },
          occupants: true,
          charges: true,
          payments: true,
        },
      });
    });
  }

  // ── Quick Status Change ───────────────────────────────────
  async updateStatus(id: string, status: ReservationStatus) {
    const reservation = await this.findById(id);

    if (status === ReservationStatus.CHECKED_OUT && reservation.billingSummary.remainingBalance > 0) {
      throw new BadRequestException('Cannot check out: There is an outstanding balance.');
    }

    return this.prisma.reservation.update({
      where: { id },
      data: { status },
      include: {
        facilities: {
          include: {
            facility: {
              include: { facilityType: true },
            },
          },
        },
        occupants: true,
        charges: true,
        payments: true,
      },
    });
  }

  // ── BILLING & CHARGES OPERATIONS ─────────────────────────

  async getBillingSummary(reservationId: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        charges: { orderBy: { createdAt: 'asc' } },
        payments: { orderBy: { paidAt: 'asc' } },
      },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    const totalCharges = reservation.charges.reduce((sum, c) => sum + c.amount * c.quantity, 0);
    const totalPayments = reservation.payments.reduce((sum, p) => sum + p.amount, 0);
    const remainingBalance = totalCharges - totalPayments;
    let paymentStatus = 'UNPAID';
    if (totalPayments > 0) {
      paymentStatus = remainingBalance <= 0 ? 'PAID' : 'PARTIALLY_PAID';
    }

    return {
      charges: reservation.charges,
      payments: reservation.payments,
      summary: {
        totalCharges,
        totalPayments,
        remainingBalance,
        paymentStatus,
      },
    };
  }

  async addCharge(reservationId: string, dto: CreateChargeDto) {
    // Check if reservation exists
    const reservation = await this.prisma.reservation.findUnique({ where: { id: reservationId } });
    if (!reservation) throw new NotFoundException('Reservation not found');

    const charge = await this.prisma.charge.create({
      data: {
        reservationId,
        description: dto.description,
        quantity: dto.quantity,
        amount: dto.amount,
        type: dto.type,
      },
    });

    return charge;
  }

  async removeCharge(reservationId: string, chargeId: string) {
    const charge = await this.prisma.charge.findFirst({
      where: { id: chargeId, reservationId },
    });
    if (!charge) throw new NotFoundException('Charge not found on this reservation');

    await this.prisma.charge.delete({ where: { id: chargeId } });
    return { success: true };
  }

  // ── PAYMENTS OPERATIONS ───────────────────────────────────

  async addPayment(reservationId: string, dto: CreatePaymentDto) {
    const reservation = await this.prisma.reservation.findUnique({ where: { id: reservationId } });
    if (!reservation) throw new NotFoundException('Reservation not found');

    const payment = await this.prisma.payment.create({
      data: {
        reservationId,
        amount: dto.amount,
        method: dto.method,
        referenceNumber: dto.referenceNumber,
        paidAt: dto.paidAt ? new Date(dto.paidAt) : undefined,
      },
    });

    return payment;
  }

  async removePayment(reservationId: string, paymentId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, reservationId },
    });
    if (!payment) throw new NotFoundException('Payment record not found on this reservation');

    await this.prisma.payment.delete({ where: { id: paymentId } });
    return { success: true };
  }
}
