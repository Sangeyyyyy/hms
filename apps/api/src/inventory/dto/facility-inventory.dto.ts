import { IsUUID, IsInt, Min, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ItemCondition, ItemStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class UpdateFacilityInventoryDto {
  @ApiProperty({ example: 'uuid-of-item' })
  @IsUUID()
  itemId: string;

  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  quantity: number;

  @ApiPropertyOptional({ enum: ItemCondition, example: 'GOOD' })
  @IsEnum(ItemCondition)
  @IsOptional()
  condition?: ItemCondition;

  @ApiPropertyOptional({ enum: ItemStatus, example: 'ACTIVE' })
  @IsEnum(ItemStatus)
  @IsOptional()
  status?: ItemStatus;
}
