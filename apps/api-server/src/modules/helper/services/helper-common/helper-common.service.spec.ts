import { Test, TestingModule } from '@nestjs/testing';
import { HelperCommonService } from './helper-common.service';

describe('HelperCommonService', () => {
  let service: HelperCommonService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HelperCommonService],
    }).compile();

    service = module.get<HelperCommonService>(HelperCommonService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('deepFreezeObject', () => {
    it('positive: should return a recursively frozen object', () => {
      const obj = {
        level1: {
          level2: {
            level3: 'done',
          },
        },
      };

      const result = service.deepFreezeObject<typeof obj>(obj);

      expect(result).toBeFrozen();
      expect(result.level1).toBeFrozen();
      expect(result.level1.level2).toBeFrozen();
    });
  });
});
