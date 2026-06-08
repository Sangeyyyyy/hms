import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFacilityTypeDto } from './dto/create-facility-type.dto';
import { UpdateFacilityTypeDto } from './dto/update-facility-type.dto';
import { CreateFacilityDto } from './dto/create-facility.dto';
import { UpdateFacilityDto } from './dto/update-facility.dto';
import { QueryFacilitiesDto } from './dto/query-facilities.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class FacilitiesService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // ── Facility Type Management ────────────────────────────────
  // ============================================================

  async findAllTypes() {
    return this.prisma.facilityType.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { facilities: true },
        },
      },
    });
  }

  async findTypeById(id: string) {
    const type = await this.prisma.facilityType.findUnique({
      where: { id },
    });
    if (!type) {
      throw new NotFoundException(`Facility type with ID "${id}" not found`);
    }
    return type;
  }

  async createType(dto: CreateFacilityTypeDto) {
    const exists = await this.prisma.facilityType.findUnique({
      where: { name: dto.name },
    });
    if (exists) {
      throw new ConflictException(`Facility type "${dto.name}" already exists`);
    }

    if (dto.baseCapacity > dto.maxCapacity) {
      throw new BadRequestException('Base capacity cannot exceed maximum capacity');
    }

    return this.prisma.facilityType.create({
      data: dto,
    });
  }

  async updateType(id: string, dto: UpdateFacilityTypeDto) {
    const type = await this.findTypeById(id);

    if (dto.name && dto.name !== type.name) {
      const exists = await this.prisma.facilityType.findUnique({
        where: { name: dto.name },
      });
      if (exists) {
        throw new ConflictException(`Facility type "${dto.name}" already exists`);
      }
    }

    const base = dto.baseCapacity !== undefined ? dto.baseCapacity : type.baseCapacity;
    const max = dto.maxCapacity !== undefined ? dto.maxCapacity : type.maxCapacity;
    if (base > max) {
      throw new BadRequestException('Base capacity cannot exceed maximum capacity');
    }

    return this.prisma.facilityType.update({
      where: { id },
      data: dto,
    });
  }

  async removeType(id: string) {
    await this.findTypeById(id);

    const count = await this.prisma.facility.count({
      where: { facilityTypeId: id },
    });
    if (count > 0) {
      throw new BadRequestException(
        'Cannot delete facility type as it is linked to active facilities'
      );
    }

    return this.prisma.facilityType.delete({
      where: { id },
    });
  }

  // ============================================================
  // ── Facility Management ─────────────────────────────────────
  // ============================================================

  async findAll(query: QueryFacilitiesDto) {
    const { search, facilityTypeId, isActive, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.FacilityWhereInput = {
      ...(facilityTypeId && { facilityTypeId }),
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        OR: [
          { facilityCode: { contains: search } },
          { building: { contains: search } },
          {
            facilityType: {
              name: { contains: search },
            },
          },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.facility.findMany({
        where,
        include: {
          facilityType: true,
        },
        orderBy: { facilityCode: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.facility.count({ where }),
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
    const facility = await this.prisma.facility.findUnique({
      where: { id },
      include: { facilityType: true },
    });
    if (!facility) {
      throw new NotFoundException(`Facility with ID "${id}" not found`);
    }
    return facility;
  }

  async create(dto: CreateFacilityDto) {
    // Verify type exists
    await this.findTypeById(dto.facilityTypeId);

    const exists = await this.prisma.facility.findUnique({
      where: { facilityCode: dto.facilityCode },
    });
    if (exists) {
      throw new ConflictException(`Facility code "${dto.facilityCode}" is already in use`);
    }

    return this.prisma.facility.create({
      data: dto,
      include: { facilityType: true },
    });
  }

  async update(id: string, dto: UpdateFacilityDto) {
    const facility = await this.findById(id);

    if (dto.facilityTypeId) {
      await this.findTypeById(dto.facilityTypeId);
    }

    if (dto.facilityCode && dto.facilityCode !== facility.facilityCode) {
      const exists = await this.prisma.facility.findUnique({
        where: { facilityCode: dto.facilityCode },
      });
      if (exists) {
        throw new ConflictException(`Facility code "${dto.facilityCode}" is already in use`);
      }
    }

    return this.prisma.facility.update({
      where: { id },
      data: dto,
      include: { facilityType: true },
    });
  }

  async setActive(id: string, isActive: boolean) {
    await this.findById(id);
    return this.prisma.facility.update({
      where: { id },
      data: { isActive },
      include: { facilityType: true },
    });
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.facility.delete({
      where: { id },
    });
  }

  // ============================================================
  // ── Availability Check ──────────────────────────────────────
  // ============================================================

  async getAvailability(checkIn: string, checkOut: string) {
    const start = new Date(checkIn);
    const end = new Date(checkOut);

    const facilities = await this.prisma.facility.findMany({
      include: {
        facilityType: true,
        reservationFacilities: {
          where: {
            reservation: {
              status: { notIn: ['CANCELLED', 'NO_SHOW'] as any },
              checkInDate: { lt: end },
              checkOutDate: { gt: start },
            },
          },
          include: {
            reservation: {
              select: {
                id: true,
                reservationNumber: true,
                status: true,
                checkInDate: true,
                checkOutDate: true,
                holderFirstName: true,
                holderLastName: true,
              },
            },
          },
        },
      },
      orderBy: { facilityCode: 'asc' },
    });

    return facilities.map((f) => {
      let status: 'AVAILABLE' | 'RESERVED' | 'OCCUPIED' | 'MAINTENANCE';

      if (!f.isActive) {
        status = 'MAINTENANCE';
      } else if (
        f.reservationFacilities.some((rf) => rf.reservation.status === 'CHECKED_IN')
      ) {
        status = 'OCCUPIED';
      } else if (f.reservationFacilities.length > 0) {
        status = 'RESERVED';
      } else {
        status = 'AVAILABLE';
      }

      return {
        id: f.id,
        facilityCode: f.facilityCode,
        building: f.building,
        isActive: f.isActive,
        facilityType: f.facilityType,
        status,
        conflictingReservations: f.reservationFacilities.map((rf) => rf.reservation),
      };
    });
  }

  // ── Calendar Events ─────────────────────────────────────────
  async getCalendarEvents(start: string, end: string) {
    const reservations = await this.prisma.reservation.findMany({
      where: {
        status: { notIn: ['CANCELLED', 'NO_SHOW'] as any },
        checkInDate: { lte: new Date(end) },
        checkOutDate: { gte: new Date(start) },
      },
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

    // One FullCalendar event per facility per reservation
    const STATUS_COLORS: Record<string, string> = {
      DRAFT:       '#94a3b8',
      PENDING:     '#f59e0b',
      CONFIRMED:   '#3b82f6',
      CHECKED_IN:  '#10b981',
      CHECKED_OUT: '#8b5cf6',
      COMPLETED:   '#14b8a6',
    };

    const events: object[] = [];
    for (const r of reservations) {
      for (const rf of r.facilities) {
        events.push({
          id: `${r.id}-${rf.facilityId}`,
          title: `${rf.facility.facilityCode} · ${r.holderFirstName} ${r.holderLastName}`,
          start: r.checkInDate,
          end: r.checkOutDate,
          backgroundColor: STATUS_COLORS[r.status] ?? '#64748b',
          borderColor: STATUS_COLORS[r.status] ?? '#64748b',
          extendedProps: {
            reservationId: r.id,
            reservationNumber: r.reservationNumber,
            status: r.status,
            holderName: `${r.holderFirstName} ${r.holderLastName}`,
            facilityCode: rf.facility.facilityCode,
            facilityType: rf.facility.facilityType.name,
          },
        });
      }
    }

    return events;
  }
}

