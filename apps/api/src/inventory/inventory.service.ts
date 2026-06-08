import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { CreateItemDto, UpdateItemDto } from './dto/item.dto';
import { UpdateFacilityInventoryDto } from './dto/facility-inventory.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Categories CRUD ─────────────────────────────────────────
  async getCategories() {
    return this.prisma.inventoryCategory.findMany({
      include: { items: true },
      orderBy: { name: 'asc' },
    });
  }

  async getCategory(id: string) {
    const category = await this.prisma.inventoryCategory.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!category) throw new NotFoundException('Inventory category not found');
    return category;
  }

  async createCategory(dto: CreateCategoryDto) {
    const exists = await this.prisma.inventoryCategory.findUnique({
      where: { name: dto.name },
    });
    if (exists) throw new ConflictException('Category name already exists');
    return this.prisma.inventoryCategory.create({ data: dto });
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    await this.getCategory(id);
    return this.prisma.inventoryCategory.update({
      where: { id },
      data: dto,
    });
  }

  async deleteCategory(id: string) {
    const category = await this.getCategory(id);
    if (category.items.length > 0) {
      throw new ConflictException('Cannot delete category with associated items');
    }
    return this.prisma.inventoryCategory.delete({ where: { id } });
  }

  // ── Items CRUD ──────────────────────────────────────────────
  async getItems() {
    return this.prisma.inventoryItem.findMany({
      include: { category: true },
      orderBy: { name: 'asc' },
    });
  }

  async getItem(id: string) {
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!item) throw new NotFoundException('Inventory item not found');
    return item;
  }

  async createItem(dto: CreateItemDto) {
    const exists = await this.prisma.inventoryItem.findUnique({
      where: { name: dto.name },
    });
    if (exists) throw new ConflictException('Item name already exists');
    
    // Verify category exists
    await this.getCategory(dto.categoryId);

    return this.prisma.inventoryItem.create({ data: dto, include: { category: true } });
  }

  async updateItem(id: string, dto: UpdateItemDto) {
    await this.getItem(id);
    await this.getCategory(dto.categoryId);

    return this.prisma.inventoryItem.update({
      where: { id },
      data: dto,
      include: { category: true },
    });
  }

  async deleteItem(id: string) {
    await this.getItem(id);
    return this.prisma.inventoryItem.delete({ where: { id } });
  }

  // ── Facility Inventory Management ───────────────────────────
  async getFacilityInventory(facilityId: string) {
    // Verify facility exists
    const facility = await this.prisma.facility.findUnique({ where: { id: facilityId } });
    if (!facility) throw new NotFoundException('Facility not found');

    return this.prisma.facilityInventory.findMany({
      where: { facilityId },
      include: { item: { include: { category: true } } },
      orderBy: { item: { name: 'asc' } },
    });
  }

  async updateFacilityInventory(facilityId: string, dto: UpdateFacilityInventoryDto) {
    // Verify facility
    const facility = await this.prisma.facility.findUnique({ where: { id: facilityId } });
    if (!facility) throw new NotFoundException('Facility not found');

    // Verify item
    await this.getItem(dto.itemId);

    if (dto.quantity === 0) {
      // Remove item if quantity is set to 0
      try {
        await this.prisma.facilityInventory.delete({
          where: {
            facilityId_itemId: {
              facilityId,
              itemId: dto.itemId,
            },
          },
        });
        return { message: 'Item removed from facility inventory' };
      } catch {
        return { message: 'Item was not assigned to this facility' };
      }
    }

    return this.prisma.facilityInventory.upsert({
      where: {
        facilityId_itemId: {
          facilityId,
          itemId: dto.itemId,
        },
      },
      update: {
        quantity: dto.quantity,
        condition: dto.condition,
        status: dto.status,
      },
      create: {
        facilityId,
        itemId: dto.itemId,
        quantity: dto.quantity,
        condition: dto.condition ?? 'GOOD',
        status: dto.status ?? 'ACTIVE',
      },
      include: { item: { include: { category: true } } },
    });
  }

  async removeItemFromFacility(facilityId: string, itemId: string) {
    try {
      return await this.prisma.facilityInventory.delete({
        where: {
          facilityId_itemId: {
            facilityId,
            itemId,
          },
        },
      });
    } catch {
      throw new NotFoundException('Item assignment not found');
    }
  }
}
