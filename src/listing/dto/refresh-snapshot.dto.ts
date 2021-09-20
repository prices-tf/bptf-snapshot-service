import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsPositive } from 'class-validator';

export class RefreshSnapshotDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  delay?: number;
}
