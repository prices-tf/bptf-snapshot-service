import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';

export class RefreshSnapshotDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  delay?: number;
}
