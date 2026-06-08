import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateReservationDto } from './create-reservation.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { ReservationStatus } from '@prisma/client';

export class UpdateReservationDto extends PartialType(CreateReservationDto) {
  @ApiPropertyOptional({ enum: ReservationStatus })
  @IsOptional()
  @IsEnum(ReservationStatus)
  status?: ReservationStatus;
}
