import { Test, TestingModule } from '@nestjs/testing';
import { SkinService } from './skin.service';

describe('SkinService', () => {
  let service: SkinService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: SkinService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<SkinService>(SkinService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
