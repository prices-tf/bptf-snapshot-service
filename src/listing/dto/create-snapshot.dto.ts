import {
  IsArray,
  IsBoolean,
  IsDefined,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsSteamID64 } from '../../common/decorator/validation/IsSteamID64';
import { ListingIntent } from '../enums/listing-intent.enum';

class ItemAttributeAccountInfoDto {
  @IsDefined()
  steamid: number;

  @IsDefined()
  @IsString()
  personaname: string;
}

export class ItemAttributeDto {
  @IsOptional()
  readonly itemdef: number | string;

  @IsOptional()
  readonly quality: number | string;

  @IsDefined()
  readonly defindex: number | string;

  @IsOptional()
  readonly quantity: number | string;

  @IsOptional()
  readonly is_output: boolean | string;

  @IsOptional()
  readonly value: number | string | null;

  @IsOptional()
  readonly float_value: number | string;

  @IsOptional()
  @Type(() => ItemAttributeAccountInfoDto)
  readonly account_info: ItemAttributeAccountInfoDto;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ItemAttributeDto)
  readonly attributes: ItemAttributeDto[];

  @IsOptional()
  @IsBoolean()
  readonly match_all_attribs: boolean;
}

export class ItemDto {
  @IsDefined()
  @IsInt()
  readonly defindex: number;

  @IsDefined()
  @IsInt()
  readonly quality: number;

  @IsOptional()
  @IsInt()
  readonly id: number;

  @IsOptional()
  @IsBoolean()
  readonly flag_cannot_craft: boolean;

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
  readonly attributes: ItemAttributeDto[];
}

class CurrenciesDto {
  @IsOptional()
  @IsNumber()
  readonly keys: number;

  @IsOptional()
  @IsNumber()
  readonly metal: number;
}

class UserAgentDto {
  @IsDefined()
  @IsInt()
  @IsPositive()
  readonly lastPulse: number;

  @IsDefined()
  @IsString()
  readonly client: string;
}

class ListingDto {
  @IsDefined()
  @IsSteamID64()
  readonly steamid: string;

  @IsDefined()
  @IsInt()
  @Max(1)
  @Min(0)
  readonly offers: 0 | 1;

  @IsDefined()
  @IsInt()
  @Max(1)
  @Min(0)
  readonly buyout: 0 | 1;

  @IsDefined()
  @IsString()
  readonly details: string;

  @IsDefined()
  @IsEnum(ListingIntent)
  readonly intent: ListingIntent;

  @IsDefined()
  @IsInt()
  @IsPositive()
  readonly timestamp: number;

  @IsDefined()
  @ValidateNested()
  @Type(() => ItemDto)
  readonly item: ItemDto;

  @IsDefined()
  @ValidateNested()
  @Type(() => CurrenciesDto)
  readonly currencies: CurrenciesDto;

  @IsDefined()
  @IsInt()
  @IsPositive()
  readonly bump: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => UserAgentDto)
  readonly userAgent: UserAgentDto;
}

export class CreateSnapshotDto {
  @IsDefined()
  @IsString()
  readonly sku: string;

  @IsDefined()
  @IsString()
  readonly name: string;

  @IsDefined()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ListingDto)
  readonly listings: ListingDto[];

  @IsDefined()
  @IsNumber()
  readonly createdAt: number;
}
