import { IsString, IsNotEmpty, IsNumber, Min, IsArray, ValidateNested, Matches } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class BulkImportBookingItemDto {
  @ApiProperty({ example: 'Juan Dela Cruz' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '2026-01-15' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'checkIn must be in YYYY-MM-DD format' })
  checkIn: string;

  @ApiProperty({ example: '2026-01-17' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'checkOut must be in YYYY-MM-DD format' })
  checkOut: string;

  @ApiProperty({ example: 'V101, D201' })
  @IsString()
  @IsNotEmpty()
  facilityCodes: string;

  @ApiProperty({ example: 10000 })
  @IsNumber()
  @Min(0)
  totalAmount: number;
}

export class BulkImportReservationsDto {
  @ApiProperty({ type: [BulkImportBookingItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkImportBookingItemDto)
  bookings: BulkImportBookingItemDto[];
}
