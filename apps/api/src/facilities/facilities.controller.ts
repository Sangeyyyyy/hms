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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { FacilitiesService } from './facilities.service';
import { CreateFacilityTypeDto } from './dto/create-facility-type.dto';
import { UpdateFacilityTypeDto } from './dto/update-facility-type.dto';
import { CreateFacilityDto } from './dto/create-facility.dto';
import { UpdateFacilityDto } from './dto/update-facility.dto';
import { QueryFacilitiesDto } from './dto/query-facilities.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('Facilities')
@ApiBearerAuth('JWT-auth')
@UseGuards(RolesGuard)
@Controller('facilities')
export class FacilitiesController {
  constructor(private readonly service: FacilitiesService) {}

  // ============================================================
  // ── Facility Type Endpoints ─────────────────────────────────
  // ============================================================

  @Get('types')
  @ApiOperation({ summary: 'List all facility types (Manager & Front Desk)' })
  findAllTypes() {
    return this.service.findAllTypes();
  }

  @Get('types/:id')
  @ApiOperation({ summary: 'Get facility type by ID' })
  findTypeById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findTypeById(id);
  }

  @Post('types')
  @Roles(Role.HOSTEL_MANAGER)
  @ApiOperation({ summary: 'Create facility type (Manager only)' })
  createType(@Body() dto: CreateFacilityTypeDto) {
    return this.service.createType(dto);
  }

  @Patch('types/:id')
  @Roles(Role.HOSTEL_MANAGER)
  @ApiOperation({ summary: 'Update facility type rates/capacities (Manager only)' })
  updateType(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFacilityTypeDto
  ) {
    return this.service.updateType(id, dto);
  }

  @Delete('types/:id')
  @Roles(Role.HOSTEL_MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete facility type (Manager only)' })
  removeType(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.removeType(id);
  }

  // ============================================================
  // ── Facility Endpoints ──────────────────────────────────────
  // ============================================================

  @Get()
  @ApiOperation({ summary: 'List facilities with search & pagination (Manager & Front Desk)' })
  findAll(@Query() query: QueryFacilitiesDto) {
    return this.service.findAll(query);
  }

  @Get('availability')
  @ApiOperation({ summary: 'Check facility availability for a date range (all roles)' })
  @ApiResponse({ status: 200, description: 'Array of facilities with computed status' })
  checkAvailability(
    @Query('checkIn') checkIn: string,
    @Query('checkOut') checkOut: string
  ) {
    return this.service.getAvailability(checkIn, checkOut);
  }

  @Get('calendar')
  @ApiOperation({ summary: 'Fetch FullCalendar-compatible events for a date window (all roles)' })
  getCalendarEvents(
    @Query('start') start: string,
    @Query('end') end: string
  ) {
    return this.service.getCalendarEvents(start, end);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get facility by ID (Manager & Front Desk)' })
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @Post()
  @Roles(Role.HOSTEL_MANAGER)
  @ApiOperation({ summary: 'Create facility (Manager only)' })
  create(@Body() dto: CreateFacilityDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(Role.HOSTEL_MANAGER)
  @ApiOperation({ summary: 'Update facility details (Manager only)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFacilityDto
  ) {
    return this.service.update(id, dto);
  }

  @Patch(':id/activate')
  @Roles(Role.HOSTEL_MANAGER)
  @ApiOperation({ summary: 'Activate facility (Manager only)' })
  activate(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.setActive(id, true);
  }

  @Patch(':id/deactivate')
  @Roles(Role.HOSTEL_MANAGER)
  @ApiOperation({ summary: 'Deactivate facility (Manager only)' })
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.setActive(id, false);
  }

  @Delete(':id')
  @Roles(Role.HOSTEL_MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete facility (Manager only)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
