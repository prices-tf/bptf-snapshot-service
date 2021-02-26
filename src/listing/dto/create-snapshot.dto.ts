import {
  IsArray,
  IsDate,
  IsDefined,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateListingDto } from './create-listing.dto';

export class CreateSnapshotDto {
  @IsDefined()
  @IsString()
  readonly sku: string;

  @IsDefined()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateListingDto)
  readonly listings: CreateListingDto[];

  @IsDefined()
  @IsDate()
  @Type(() => Date)
  readonly createdAt: Date;
}
