import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { ScryptService } from './scrypt.service';

describe('ScryptService', () => {
  let service: ScryptService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ScryptService],
    }).compile();

    service = module.get<ScryptService>(ScryptService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('hash', () => {
    it('positive: should return a serialized hash string', async () => {
      const HASH_LENGTH = 170;
      const STRING_FOR_HASHING: string = randomUUID();
      const result = await service.hash(STRING_FOR_HASHING);
      expect(result).toBeDefined();
      expect(result).toBeString();
      expect(result.length).toEqual(HASH_LENGTH);
    });
  });
  describe('verify', () => {
    it('positive: should verify hash', async () => {
      const STRING_FOR_HASHING: string = randomUUID();
      const hash = await service.hash(STRING_FOR_HASHING);
      const isVerified = await service.verify(STRING_FOR_HASHING, hash);
      expect(isVerified).toBeDefined();
      expect(isVerified).toBeBoolean();
      expect(isVerified).toEqual(true);
    });
  });
});
