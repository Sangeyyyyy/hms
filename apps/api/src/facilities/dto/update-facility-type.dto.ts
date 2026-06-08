import { PartialType } from '@nestjs/swagger';
import { CreateFacilityTypeDto } from './create-facility-type.dto';

export class UpdateFacilityTypeDto extends PartialType(CreateFacilityTypeDto) {}
