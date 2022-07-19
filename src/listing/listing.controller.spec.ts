import { Test, TestingModule } from '@nestjs/testing';
import { ListingController } from './listing.controller';
import { ListingService } from './listing.service';
import { SchemaService } from '../schema/schema.service';
import { SkinService } from '../skin/skin.service';

describe('ListingController', () => {
  let controller: ListingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ListingController],
      providers: [
        {
          provide: ListingService,
          useValue: {},
        },
        {
          provide: SchemaService,
          useValue: {},
        },
        {
          provide: SkinService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<ListingController>(ListingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
