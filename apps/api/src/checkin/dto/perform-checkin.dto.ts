import {
  IsString,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class PerformCheckInDto {
  @ApiProperty({ example: '2026-06-07T08:00:00.000Z', description: 'Actual arrival timestamp' })
  @IsDateString()
  actualArrivalAt: string;

  @ApiPropertyOptional({ example: 'ID verified: Gov ID presented. Key card issued.' })
  @IsString()
  @IsOptional()
  verificationNotes?: string;

  @ApiPropertyOptional({ example: 3, description: 'Actual number of occupants who arrived' })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  actualOccupantCount?: number;

  @ApiPropertyOptional({ example: 'Guest arrived with 2 additional companions.' })
  @IsString()
  @IsOptional()
  remarks?: string;
}
