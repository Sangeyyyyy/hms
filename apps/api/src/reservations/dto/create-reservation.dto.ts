import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsDateString,
  IsOptional,
  IsArray,
  IsUUID,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ClientType } from '@prisma/client';

export class OccupantDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiPropertyOptional({ example: 'john.doe@gmail.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '09123456789' })
  @IsOptional()
  @IsString()
  phone?: string;
}

export class CreateReservationDto {
  @ApiProperty({ example: 'Alice' })
  @IsString()
  @IsNotEmpty()
  holderFirstName: string;

  @ApiProperty({ example: 'Smith' })
  @IsString()
  @IsNotEmpty()
  holderLastName: string;

  @ApiProperty({ example: 'alice.smith@example.com' })
  @IsEmail()
  holderEmail: string;

  @ApiProperty({ example: '+639123456789' })
  @IsString()
  @IsNotEmpty()
  holderPhone: string;

  @ApiProperty({ example: '2026-06-10T14:00:00.000Z' })
  @IsDateString()
  checkInDate: string;

  @ApiProperty({ example: '2026-06-15T12:00:00.000Z' })
  @IsDateString()
  checkOutDate: string;

  @ApiPropertyOptional({ example: 'Prefers quiet floor room.' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ example: ['facility-uuid-1', 'facility-uuid-2'] })
  @IsArray()
  @IsUUID(undefined, { each: true })
  facilityIds: string[];

  @ApiPropertyOptional({ type: [OccupantDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OccupantDto)
  occupants?: OccupantDto[];

  @ApiPropertyOptional({ example: '123 Main St' })
  @IsOptional()
  @IsString()
  holderAddress?: string;

  @ApiPropertyOptional({ example: 'Panabo City' })
  @IsOptional()
  @IsString()
  holderCity?: string;

  @ApiPropertyOptional({ example: 'Davao del Norte' })
  @IsOptional()
  @IsString()
  holderState?: string;

  @ApiPropertyOptional({ example: '8105' })
  @IsOptional()
  @IsString()
  holderZipCode?: string;

  @ApiPropertyOptional({ example: 'Philippines' })
  @IsOptional()
  @IsString()
  holderCountry?: string;

  @ApiPropertyOptional({ example: 'MALE' })
  @IsOptional()
  @IsString()
  holderGender?: string;

  @ApiPropertyOptional({ example: 'EMAIL' })
  @IsOptional()
  @IsString()
  preferredContactMethod?: string;

  @ApiPropertyOptional({ example: 'Jane Smith' })
  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @ApiPropertyOptional({ example: '09123456789' })
  @IsOptional()
  @IsString()
  emergencyContactPhone?: string;

  @ApiPropertyOptional({ example: 'Spouse' })
  @IsOptional()
  @IsString()
  emergencyContactRelation?: string;

  @ApiPropertyOptional({ example: '8am-12nn' })
  @IsOptional()
  @IsString()
  functionHallPreferredTime?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  hasAvailedBefore?: boolean;

  @ApiPropertyOptional({ example: 'Website' })
  @IsOptional()
  @IsString()
  referralSource?: string;

  @ApiPropertyOptional({ enum: ClientType, example: 'EXTERNAL' })
  @IsOptional()
  @IsEnum(ClientType)
  clientType?: ClientType;
}
