import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  ValidationPipe,
} from '@nestjs/common';
import { Snapshot } from '../listing/models/snapshot.entity';
import { CreateSnapshotDto } from './dto/create-snapshot.dto';
import { ListingService } from './listing.service';

// TODO: Validate sku?

@Controller('listings')
export class ListingController {
  constructor(private readonly listingService: ListingService) {}

  @Post('/:sku/refresh')
  async enqueueSnapshot(
    @Param('sku') sku: string,
  ): Promise<{
    enqueued: boolean;
  }> {
    await this.listingService.enqueueSnapshot(sku);

    return {
      enqueued: true,
    };
  }

  @Get('/:sku')
  async getListingsForItem(@Param('sku') sku: string): Promise<Snapshot> {
    const snapshot = await this.listingService.getListingsBySKU(sku);

    if (!snapshot) {
      throw new NotFoundException('No listings saved for item');
    }

    return snapshot;
  }

  @Post()
  async saveListings(
    @Body(new ValidationPipe()) createSnapshot: CreateSnapshotDto,
  ): Promise<{
    id: string;
  }> {
    const snapshot = await this.listingService.saveSnapshot(createSnapshot);

    return {
      id: snapshot.id,
    };
  }
}
