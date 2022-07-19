import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { Listing } from './listing.entity';

@Entity()
export class Snapshot {
  @PrimaryColumn()
  readonly sku: string;

  @Column()
  readonly name: string;

  @OneToMany(() => Listing, (listing) => listing.snapshot, {
    cascade: true,
  })
  readonly listings: Listing[];

  @Column()
  readonly createdAt: Date;
}
