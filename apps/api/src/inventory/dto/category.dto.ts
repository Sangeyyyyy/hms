import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Furniture' })
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class UpdateCategoryDto extends CreateCategoryDto {}
