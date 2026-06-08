import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { InventoryService } from './inventory.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { CreateItemDto, UpdateItemDto } from './dto/item.dto';
import { UpdateFacilityInventoryDto } from './dto/facility-inventory.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('Inventory Management')
@ApiBearerAuth('JWT-auth')
@UseGuards(RolesGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  // ── Categories CRUD (Hostel Manager only) ───────────────────
  @Get('categories')
  @Roles(Role.HOSTEL_MANAGER, Role.FRONT_DESK)
  @ApiOperation({ summary: 'Get all inventory categories' })
  getCategories() {
    return this.service.getCategories();
  }

  @Get('categories/:id')
  @Roles(Role.HOSTEL_MANAGER, Role.FRONT_DESK)
  @ApiOperation({ summary: 'Get details of a specific inventory category' })
  getCategory(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getCategory(id);
  }

  @Post('categories')
  @Roles(Role.HOSTEL_MANAGER)
  @ApiOperation({ summary: 'Create new inventory category (Manager only)' })
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.service.createCategory(dto);
  }

  @Put('categories/:id')
  @Roles(Role.HOSTEL_MANAGER)
  @ApiOperation({ summary: 'Update inventory category (Manager only)' })
  updateCategory(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCategoryDto) {
    return this.service.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @Roles(Role.HOSTEL_MANAGER)
  @ApiOperation({ summary: 'Delete inventory category (Manager only)' })
  deleteCategory(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.deleteCategory(id);
  }

  // ── Items CRUD (Hostel Manager only) ────────────────────────
  @Get('items')
  @Roles(Role.HOSTEL_MANAGER, Role.FRONT_DESK)
  @ApiOperation({ summary: 'Get all inventory items' })
  getItems() {
    return this.service.getItems();
  }

  @Get('items/:id')
  @Roles(Role.HOSTEL_MANAGER, Role.FRONT_DESK)
  @ApiOperation({ summary: 'Get a specific inventory item' })
  getItem(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getItem(id);
  }

  @Post('items')
  @Roles(Role.HOSTEL_MANAGER)
  @ApiOperation({ summary: 'Create new inventory item (Manager only)' })
  createItem(@Body() dto: CreateItemDto) {
    return this.service.createItem(dto);
  }

  @Put('items/:id')
  @Roles(Role.HOSTEL_MANAGER)
  @ApiOperation({ summary: 'Update inventory item (Manager only)' })
  updateItem(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateItemDto) {
    return this.service.updateItem(id, dto);
  }

  @Delete('items/:id')
  @Roles(Role.HOSTEL_MANAGER)
  @ApiOperation({ summary: 'Delete inventory item (Manager only)' })
  deleteItem(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.deleteItem(id);
  }

  // ── Facility Inventory CRUD ─────────────────────────────────
  @Get('facilities/:facilityId')
  @Roles(Role.HOSTEL_MANAGER, Role.FRONT_DESK)
  @ApiOperation({ summary: 'Get inventory list for a specific facility' })
  getFacilityInventory(@Param('facilityId', ParseUUIDPipe) facilityId: string) {
    return this.service.getFacilityInventory(facilityId);
  }

  @Post('facilities/:facilityId')
  @Roles(Role.HOSTEL_MANAGER, Role.FRONT_DESK)
  @ApiOperation({ summary: 'Assign or update item quantity/condition/status in a facility' })
  updateFacilityInventory(
    @Param('facilityId', ParseUUIDPipe) facilityId: string,
    @Body() dto: UpdateFacilityInventoryDto,
  ) {
    return this.service.updateFacilityInventory(facilityId, dto);
  }

  @Delete('facilities/:facilityId/items/:itemId')
  @Roles(Role.HOSTEL_MANAGER, Role.FRONT_DESK)
  @ApiOperation({ summary: 'Remove an item from a facility inventory' })
  removeItemFromFacility(
    @Param('facilityId', ParseUUIDPipe) facilityId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return this.service.removeItemFromFacility(facilityId, itemId);
  }
}
