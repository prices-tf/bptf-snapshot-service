import { ListingIntent } from '../enums/listing-intent.enum';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Listing {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string;

  @Column()
  readonly steamid64: string;

  @Column({
    type: 'jsonb',
  })
  readonly item: any;

  @Column({
    type: 'enum',
    enum: ListingIntent,
  })
  readonly intent: ListingIntent;

  @Column()
  readonly isAutomatic: boolean;

  @Column()
  readonly isBuyout: boolean;

  @Column()
  readonly isOffers: boolean;

  @Column()
  readonly details: string;

  @Column({
    type: 'float',
  })
  readonly currenciesKeys: number;

  @Column({
    type: 'int',
  })
  readonly currenciesHalfScrap: number;

  @Column()
  readonly createdAt: Date;

  @Column()
  readonly bumpedAt: Date;
}
