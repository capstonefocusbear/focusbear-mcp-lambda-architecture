import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { PassportMiddleware } from './passport.middleware';
import { AuthService } from '../services/auth.service';
import { AuthServiceMock } from '../../../../test/mocks';
import { authtorizedPassportDummy } from '../../../../test/dummies';
import { HelperModule } from '../../helper/helper.module';

describe('PassportMiddleware', () => {
  let middleware: PassportMiddleware;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [PassportMiddleware, AuthService],
      imports: [HelperModule],
    })
      .overrideProvider(AuthService)
      .useValue(AuthServiceMock)
      .compile();

    middleware = moduleRef.get<PassportMiddleware>(PassportMiddleware);
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  describe('use', () => {
    interface IReq {
      headers: any;
      passport?: any;
    }
    const req: IReq = {
      headers: {
        authorization: 'Bearer abc...',
      },
    };
    const res = {};
    const next = jest.fn();

    AuthServiceMock.authenticate.mockReturnValueOnce(authtorizedPassportDummy);

    it('positive: req.passport should be defined as unwritable property', async () => {
      AuthServiceMock.authenticate.mockReturnValueOnce(authtorizedPassportDummy);

      await middleware.use(req, res, next);
      const passportProps = Object.getOwnPropertyDescriptor(req, 'passport');

      expect(passportProps.value).toBeObject();
      expect(passportProps.writable).toBeFalse();
      expect(passportProps.configurable).toBeFalse();
      expect(next).toHaveBeenCalled();
    });

    it('positive: req.passport should be immutable', async () => {
      let cannotReassign: any;
      let cannotDelete: any;

      await middleware.use(req, res, next);
      try {
        req.passport = 'value';
      } catch (error) {
        cannotReassign = error;
      }
      try {
        delete req.passport;
      } catch (error) {
        cannotDelete = error;
      }

      expect(cannotReassign).toBeDefined();
      expect(cannotDelete).toBeDefined();
      expect(next).toHaveBeenCalled();
    });

    it('negative: in case of any error, next() should be called with UnauthorizedException as a param', async () => {
      const errorMessage = 'Some error message';
      const exception = new UnauthorizedException(errorMessage);
      AuthServiceMock.authenticate.mockRejectedValueOnce(errorMessage);

      await middleware.use(req, res, next);

      expect(next).toHaveBeenCalledWith(exception);
    });
  });
});
