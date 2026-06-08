import { IsString, IsNotEmpty, IsInt, Min, IsNumber, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ChargeType } from '@prisma/client';

export class CreateChargeDto {
  @ApiProperty({ example: 'Extra Bed', description: 'Description of the charge' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 1, default: 1 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 500, description: 'Price per item' })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ example: 'EXTRA_BED', enum: ChargeType })
  @IsEnum(ChargeType)
  type: ChargeType;
}
