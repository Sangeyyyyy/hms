import { IsString, IsNotEmpty, IsUUID, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFacilityDto {
  @ApiProperty({ example: 'Building A', description: 'Building location' })
  @IsString()
  @IsNotEmpty()
  building: string;

  @ApiProperty({ example: 'VIP-101', description: 'Unique code identifying the facility' })
  @IsString()
  @IsNotEmpty()
  facilityCode: string;

  @ApiProperty({ example: 'uuid', description: 'ID of the facility type' })
  @IsUUID()
  facilityTypeId: string;

  @ApiProperty({ example: true, required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
