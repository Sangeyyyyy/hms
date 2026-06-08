import {
  IsString,
  IsOptional,
  IsDateString,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  IsNotEmpty,
  IsUUID,
  IsInt,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class DamageItemDto {
  @ApiProperty({ example: 'Broken mirror in bathroom' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 500 })
  @IsNumber()
  @Min(0)
  estimatedCost: number;

  @ApiPropertyOptional({ example: 'Unit A1 - Bedroom 1' })
  @IsString()
  @IsOptional()
  location?: string;
}

export class InventoryCheckDto {
  @ApiProperty({ example: 'uuid-of-item' })
  @IsUUID()
  itemId: string;

  @ApiProperty({ example: 'Bed' })
  @IsString()
  @IsNotEmpty()
  itemName: string;

  @ApiProperty({ example: 'uuid-of-facility' })
  @IsUUID()
  facilityId: string;

  @ApiProperty({ example: 'VIP-101' })
  @IsString()
  @IsNotEmpty()
  facilityCode: string;

  @ApiProperty({ example: 0, description: 'Quantity missing' })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  quantityMissing: number;

  @ApiProperty({ example: 1, description: 'Quantity damaged' })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  quantityDamaged: number;

  @ApiProperty({ example: 500, description: 'Estimated repair/replacement cost' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  estimatedCost: number;

  @ApiPropertyOptional({ example: 'Pillow missing, remote has broken casing' })
  @IsString()
  @IsOptional()
  remarks?: string;
}

export class PerformCheckOutDto {
  @ApiProperty({ example: '2026-06-07T11:00:00.000Z', description: 'Actual departure timestamp' })
  @IsDateString()
  actualDepartureAt: string;

  @ApiPropertyOptional({ example: 'All key cards returned. AC remotes checked.' })
  @IsString()
  @IsOptional()
  inventoryNotes?: string;

  @ApiPropertyOptional({
    type: [DamageItemDto],
    description: 'List of damages found during check-out inspection',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DamageItemDto)
  @IsOptional()
  damages?: DamageItemDto[];

  @ApiPropertyOptional({
    type: [InventoryCheckDto],
    description: 'Structured results of inventory checks per facility',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InventoryCheckDto)
  @IsOptional()
  inventoryChecks?: InventoryCheckDto[];

  @ApiPropertyOptional({
    example: true,
    description: 'Whether to automatically post damage/missing charges to the billing ledger',
  })
  @IsBoolean()
  @IsOptional()
  applyDamageCharges?: boolean;

  @ApiPropertyOptional({ example: 'Guest left facility in good condition overall.' })
  @IsString()
  @IsOptional()
  remarks?: string;
}
