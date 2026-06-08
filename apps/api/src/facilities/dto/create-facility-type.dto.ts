import { IsString, IsNotEmpty, IsNumber, Min, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFacilityTypeDto {
  @ApiProperty({ example: 'VIP', description: 'Name of the facility type' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 2, description: 'Base capacity of the facility' })
  @IsInt()
  @Min(1)
  baseCapacity: number;

  @ApiProperty({ example: 4, description: 'Maximum capacity of the facility' })
  @IsInt()
  @Min(1)
  maxCapacity: number;

  @ApiProperty({ example: 2500.0, description: 'Default daily/hourly rate' })
  @IsNumber()
  @Min(0)
  defaultRate: number;
}
