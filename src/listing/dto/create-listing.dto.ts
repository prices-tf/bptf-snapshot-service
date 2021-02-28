import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsDefined,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { IsSteamID64 } from '../../common/decorator/validation/IsSteamID64';
import { ListingIntent } from '../enums/listing-intent.enum';

class ItemAttributeDto {
  @IsDefined()
  @IsInt()
  readonly defindex: number;

  @IsOptional()
  readonly value: number | string;

  @IsOptional()
  @IsNumber()
  readonly float_value: number;
}

class ItemDto {
  @IsDefined()
  @IsInt()
  readonly defindex: number;

  @IsDefined()
  @IsInt()
  readonly quality: number;

  @IsDefined()
  @IsString()
  readonly name: string;

  @IsOptional()
  @IsInt()
  readonly id: number;

  @ValidateIf((o) => o.id !== undefined)
  @IsDefined()
  @IsInt()
  readonly original_id: number;

  @ValidateIf((o) => o.id !== undefined)
  @IsDefined()
  @IsInt()
  readonly level: number;

  @ValidateIf((o) => o.id !== undefined)
  @IsDefined()
  @IsInt()
  readonly inventory: number;

  @ValidateIf((o) => o.id !== undefined)
  @IsOptional()
  @IsInt()
  readonly quantity: number;

  @ValidateIf((o) => o.id !== undefined)
  @IsDefined()
  @IsInt()
  readonly origin: number;

  @ValidateIf((o) => o.id !== undefined)
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemAttributeDto)
  readonly attributes: number;
}

export class CurrenciesDto {
  @IsDefined()
  @IsNumber()
  readonly keys: number;

  @IsDefined()
  @IsNumber()
  readonly metal: number;
}

export class CreateListingDto {
  @IsDefined()
  @IsString()
  readonly id: string;

  @IsDefined()
  @IsSteamID64()
  readonly steamid64: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => ItemDto)
  readonly item: ItemDto;

  @IsDefined()
  @IsEnum(ListingIntent)
  readonly intent: ListingIntent;

  @IsDefined()
  @ValidateNested()
  @Type(() => CurrenciesDto)
  readonly currencies: CurrenciesDto;

  @IsDefined()
  @IsBoolean()
  readonly isAutomatic: boolean;

  @IsDefined()
  @IsDate()
  @Type(() => Date)
  readonly createdAt: Date;

  @IsDefined()
  @IsDate()
  @Type(() => Date)
  readonly bumpedAt: Date;
}
