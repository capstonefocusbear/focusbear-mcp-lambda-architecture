import { Test, TestingModule } from '@nestjs/testing';
import { JwtModule } from './jwt.module';
import { JwtService } from './jwt.service';

describe('JwtService', () => {
  let service: JwtService;
  let jwt: string;
  const jwtPattert = new RegExp(/^([a-zA-Z0-9_=]+)\.([a-zA-Z0-9_=]+)\.([a-zA-Z0-9_\-+/=]*)/);
  const TEST_PAYLOAD = {
    key1: 'key1',
    key2: 'key2',
  };
  const TEST_SECRET = 'test-secter';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [JwtModule.register({})],
    }).compile();

    service = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('asyncSign', () => {
    it('positive: should return jwt string', async () => {
      jwt = await service.asyncSign(TEST_PAYLOAD, TEST_SECRET, { expiresIn: '1h' });

      expect(jwt).toBeDefined();
      expect(jwt).toBeString();
      expect(jwtPattert.test(jwt)).toBeTrue();
    });
  });

  describe('asyncVerify', () => {
    it('positive: should be valid and return payload', async () => {
      const payload = await service.asyncVerify(jwt, TEST_SECRET);
      const { iat, exp, ...data } = payload;

      expect(payload).toBeDefined();
      expect(JSON.stringify(data)).toEqual(JSON.stringify(TEST_PAYLOAD));
    });
  });

  describe('decode', () => {
    it('positive: should return payload', async () => {
      const decoded = service.decode(jwt);
      const { iat, exp, ...data } = decoded;

      expect(decoded).toBeDefined();
      expect(JSON.stringify(data)).toEqual(JSON.stringify(TEST_PAYLOAD));
    });
  });
});
