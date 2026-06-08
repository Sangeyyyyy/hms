import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PerformCheckInDto } from './dto/perform-checkin.dto';
import { PerformCheckOutDto, DamageItemDto } from './dto/perform-checkout.dto';
import { ReservationStatus, ChargeType } from '@prisma/client';

@Injectable()
export class CheckinService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Helper: full reservation fetch ─────────────────────────
  private async getReservationOrThrow(id: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: {
        facilities: {
          include: {
            facility: { include: { facilityType: true } },
          },
        },
        occupants: true,
        charges: true,
        payments: true,
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        checkInRecord: { include: { processedBy: { select: { id: true, firstName: true, lastName: true } } } },
        checkOutRecord: { include: { processedBy: { select: { id: true, firstName: true, lastName: true } } } },
      },
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation not found`);
    }
    return reservation;
  }

  // ── GET: Check-In details (verification view) ──────────────
  async getCheckInDetails(reservationId: string) {
    const reservation = await this.getReservationOrThrow(reservationId);

    // Compute billing summary
    const totalCharges = reservation.charges.reduce((s, c) => s + c.amount * c.quantity, 0);
    const totalPayments = reservation.payments.reduce((s, p) => s + p.amount, 0);

    return {
      reservation,
      billingSummary: {
        totalCharges,
        totalPayments,
        remainingBalance: totalCharges - totalPayments,
      },
      canCheckIn: reservation.status === ReservationStatus.CONFIRMED,
      alreadyCheckedIn: !!reservation.checkInRecord,
    };
  }

  // ── POST: Perform Check-In ─────────────────────────────────
  async performCheckIn(reservationId: string, dto: PerformCheckInDto, processedById: string) {
    const reservation = await this.getReservationOrThrow(reservationId);

    // Guard: must be CONFIRMED
    if (reservation.status !== ReservationStatus.CONFIRMED) {
      throw new BadRequestException(
        `Reservation must be CONFIRMED to check in. Current status: ${reservation.status}`
      );
    }

    // Guard: only once
    if (reservation.checkInRecord) {
      throw new ConflictException('This reservation has already been checked in.');
    }

    // Build facilities snapshot for the slip
    const facilitiesSnapshot = reservation.facilities.map((rf) => ({
      facilityCode: rf.facility.facilityCode,
      building: rf.facility.building,
      facilityType: rf.facility.facilityType.name,
      rateApplied: rf.rateApplied,
    }));

    return this.prisma.$transaction(async (tx) => {
      // 1. Update status → CHECKED_IN
      await tx.reservation.update({
        where: { id: reservationId },
        data: { status: ReservationStatus.CHECKED_IN },
      });

      // 2. Create check-in record
      const record = await tx.checkInRecord.create({
        data: {
          reservationId,
          actualArrivalAt: new Date(dto.actualArrivalAt),
          verificationNotes: dto.verificationNotes,
          facilitiesSnapshot,
          actualOccupantCount: dto.actualOccupantCount ?? reservation.occupants.length,
          remarks: dto.remarks,
          processedById,
        },
        include: {
          processedBy: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      // 3. Fetch updated reservation for the slip
      const updated = await tx.reservation.findUnique({
        where: { id: reservationId },
        include: {
          facilities: { include: { facility: { include: { facilityType: true } } } },
          occupants: true,
          charges: true,
          payments: true,
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          checkInRecord: { include: { processedBy: { select: { id: true, firstName: true, lastName: true } } } },
        },
      });

      return {
        message: 'Check-in completed successfully.',
        reservation: updated,
        checkInRecord: record,
      };
    });
  }

  // ── GET: Check-Out details (pre-checkout view) ─────────────
  async getCheckOutDetails(reservationId: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        facilities: {
          include: {
            facility: {
              include: {
                facilityType: true,
                inventory: {
                  include: {
                    item: {
                      include: {
                        category: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        occupants: true,
        charges: true,
        payments: true,
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        checkOutRecord: true,
      },
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation not found`);
    }

    const totalCharges = reservation.charges.reduce((s, c) => s + c.amount * c.quantity, 0);
    const totalPayments = reservation.payments.reduce((s, p) => s + p.amount, 0);

    // Flatten and map facility inventory items for the checklist
    const checklist = reservation.facilities.flatMap((rf) =>
      rf.facility.inventory.map((inv) => ({
        itemId: inv.itemId,
        itemName: inv.item.name,
        categoryName: inv.item.category.name,
        facilityId: rf.facilityId,
        facilityCode: rf.facility.facilityCode,
        quantityAssigned: inv.quantity,
      }))
    );

    return {
      reservation,
      checklist,
      billingSummary: {
        totalCharges,
        totalPayments,
        remainingBalance: totalCharges - totalPayments,
      },
      canCheckOut: reservation.status === ReservationStatus.CHECKED_IN,
      alreadyCheckedOut: !!reservation.checkOutRecord,
    };
  }

  // ── POST: Perform Check-Out ────────────────────────────────
  async performCheckOut(reservationId: string, dto: PerformCheckOutDto, processedById: string) {
    const reservation = await this.getReservationOrThrow(reservationId);

    // Guard: must be CHECKED_IN
    if (reservation.status !== ReservationStatus.CHECKED_IN) {
      throw new BadRequestException(
        `Reservation must be CHECKED_IN to check out. Current status: ${reservation.status}`
      );
    }

    // Guard: only once
    if (reservation.checkOutRecord) {
      throw new ConflictException('This reservation has already been checked out.');
    }

    const damages: DamageItemDto[] = dto.damages ?? [];
    const inventoryChecks = dto.inventoryChecks ?? [];
    const applyCharges = dto.applyDamageCharges ?? true;

    return this.prisma.$transaction(async (tx) => {
      // 1. Update status → CHECKED_OUT
      await tx.reservation.update({
        where: { id: reservationId },
        data: { status: ReservationStatus.CHECKED_OUT },
      });

      // 2. Save structured inventory check logs
      if (inventoryChecks.length > 0) {
        await tx.inventoryCheckLog.createMany({
          data: inventoryChecks.map((check) => ({
            reservationId,
            facilityId: check.facilityId,
            itemId: check.itemId,
            itemName: check.itemName,
            facilityCode: check.facilityCode,
            quantityMissing: check.quantityMissing,
            quantityDamaged: check.quantityDamaged,
            estimatedCost: check.estimatedCost,
            remarks: check.remarks,
          })),
        });
      }

      // 3. Create check-out record
      const record = await tx.checkOutRecord.create({
        data: {
          reservationId,
          actualDepartureAt: new Date(dto.actualDepartureAt),
          inventoryNotes: dto.inventoryNotes,
          damagesNoted: damages as any,
          damageChargesApplied: applyCharges,
          remarks: dto.remarks,
          processedById,
        },
        include: {
          processedBy: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      // 4. Auto-post damage / missing charges to billing
      const chargesToCreate = [];

      // Add charges from the standard manual damages list
      if (applyCharges && damages.length > 0) {
        damages.forEach((dmg) => {
          chargesToCreate.push({
            reservationId,
            description: `Damage: ${dmg.description}${dmg.location ? ` (${dmg.location})` : ''}`,
            quantity: 1,
            amount: dmg.estimatedCost,
            type: ChargeType.DAMAGE_CHARGE,
          });
        });
      }

      // Add charges from the structured inventory check logs (if cost > 0)
      if (applyCharges && inventoryChecks.length > 0) {
        inventoryChecks.forEach((check) => {
          if (check.estimatedCost > 0) {
            const reasons = [];
            if (check.quantityMissing > 0) reasons.push(`${check.quantityMissing} missing`);
            if (check.quantityDamaged > 0) reasons.push(`${check.quantityDamaged} damaged`);
            const reasonStr = reasons.join(', ');

            chargesToCreate.push({
              reservationId,
              description: `Inventory Penalty: ${check.itemName} in ${check.facilityCode} (${reasonStr})`,
              quantity: 1,
              amount: check.estimatedCost,
              type: ChargeType.DAMAGE_CHARGE,
            });
          }
        });
      }

      if (chargesToCreate.length > 0) {
        await tx.charge.createMany({
          data: chargesToCreate,
        });
      }

      // 5. Fetch updated reservation for the slip
      const updated = await tx.reservation.findUnique({
        where: { id: reservationId },
        include: {
          facilities: { include: { facility: { include: { facilityType: true } } } },
          occupants: true,
          charges: true,
          payments: true,
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          checkInRecord: { include: { processedBy: { select: { id: true, firstName: true, lastName: true } } } },
          checkOutRecord: { include: { processedBy: { select: { id: true, firstName: true, lastName: true } } } },
          inventoryCheckLogs: true,
        },
      });

      const totalCharges = updated!.charges.reduce((s, c) => s + c.amount * c.quantity, 0);
      const totalPayments = updated!.payments.reduce((s, p) => s + p.amount, 0);

      return {
        message: 'Check-out completed successfully.',
        reservation: updated,
        checkOutRecord: record,
        finalBilling: {
          totalCharges,
          totalPayments,
          remainingBalance: totalCharges - totalPayments,
        },
      };
    });
  }


  // ── GET: Fetch existing check-in record (for slip reprint) ──
  async getCheckInRecord(reservationId: string) {
    const record = await this.prisma.checkInRecord.findUnique({
      where: { reservationId },
      include: {
        processedBy: { select: { id: true, firstName: true, lastName: true } },
        reservation: {
          include: {
            facilities: { include: { facility: { include: { facilityType: true } } } },
            occupants: true,
            charges: true,
            payments: true,
          },
        },
      },
    });
    if (!record) throw new NotFoundException('Check-in record not found');
    return record;
  }

  // ── GET: Fetch existing check-out record (for slip reprint) ─
  async getCheckOutRecord(reservationId: string) {
    const record = await this.prisma.checkOutRecord.findUnique({
      where: { reservationId },
      include: {
        processedBy: { select: { id: true, firstName: true, lastName: true } },
        reservation: {
          include: {
            facilities: { include: { facility: { include: { facilityType: true } } } },
            occupants: true,
            charges: true,
            payments: true,
            inventoryCheckLogs: true,
          },
        },
      },
    });
    if (!record) throw new NotFoundException('Check-out record not found');
    return record;
  }
}
