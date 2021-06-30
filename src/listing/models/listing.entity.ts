import { ListingIntent } from '../enums/listing-intent.enum';
import { Column, Entity, ManyToOne, PrimaryColumn } from 'typeorm';
import { Snapshot } from './snapshot.entity';

@Entity()
export class Listing {
  @PrimaryColumn()
  readonly id: string;

  @ManyToOne(() => Snapshot)
  snapshot: Snapshot;

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
