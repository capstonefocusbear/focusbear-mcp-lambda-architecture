import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import * as jwt from 'jsonwebtoken';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { auth0LoginUser } from '../utils/auth0-login';

describe('Auth0', () => {
  let app: NestFastifyApplication;
  const testUser = {
    email: 'testdummy@mail.com',
    password: 'Passw0rd!',
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  /**
   * 1) It requires disabled MFA in Auth0
   * 2) "On-login action" in Auth0 will call endpoint setted in Auth0
   * "Dashboard/actions/library/custom/Add user data in access Token"
   * (pay attention to it)
   * 3) "On-login action" does not work with localhost, so that Auth0 will call remote server
   */
  describe('Get accessToken with UserAuthMetadata', () => {
    it('positive: should return access token with user-auth-metadata inside', async () => {
      const tokenData = await auth0LoginUser(testUser.email, testUser.password);
      console.log({ tokenData });

      const payload = jwt.decode(tokenData.access_token);

      expect(tokenData).toBeDefined();
      expect(payload).toBeDefined();
    });
  });
});
