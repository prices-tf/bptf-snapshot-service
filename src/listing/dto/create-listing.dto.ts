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

class ItemAttributeAccountInfoDto {
  @IsDefined()
  steamid: number;

  @IsDefined()
  @IsString()
  personaname: string;
}

class ItemAttributeDto {
  @IsDefined()
  readonly defindex: number | string;

  @IsOptional()
  readonly value: number | string | null;

  @IsOptional()
  readonly float_value: number | string;

  @IsOptional()
  @Type(() => ItemAttributeAccountInfoDto)
  readonly account_info: ItemAttributeAccountInfoDto;
}

class ItemDto {
  @IsDefined()
  @IsInt()
  readonly defindex: number;

  @IsDefined()
  @IsInt()
  readonly quality: number;

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

  @IsOptional()
  readonly quantity: number | string;

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
  @IsBoolean()
  readonly isOffers: boolean;

  @IsDefined()
  @IsBoolean()
  readonly isBuyout: boolean;

  @IsDefined()
  @IsString()
  readonly details: string;

  @IsDefined()
  @IsDate()
  @Type(() => Date)
  readonly createdAt: Date;

  @IsDefined()
  @IsDate()
  @Type(() => Date)
  readonly bumpedAt: Date;
}
